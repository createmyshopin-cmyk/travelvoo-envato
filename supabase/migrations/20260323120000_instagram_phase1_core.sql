-- Phase 1: Instagram DM AI bot — core tables
-- saas_meta_platform_config, tenant_instagram_connections, dedupe, activity, config

-- Platform-level Meta app credentials (super_admin only)
CREATE TABLE IF NOT EXISTS saas_meta_platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_app_id text NOT NULL DEFAULT '',
  app_secret_encrypted text NOT NULL DEFAULT '',
  webhook_verify_token text NOT NULL DEFAULT '',
  graph_api_version text NOT NULL DEFAULT 'v21.0',
  oauth_redirect_uri text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE saas_meta_platform_config IS 'Single-row: platform-level Meta (Facebook/Instagram) app credentials. Secret is AES-encrypted at rest.';
COMMENT ON COLUMN saas_meta_platform_config.app_secret_encrypted IS 'AES-256-GCM ciphertext of the Meta App Secret (iv:tag:ciphertext hex).';

-- Ensure exactly one row exists
INSERT INTO saas_meta_platform_config (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- RLS: only service_role can read/write (no client access)
ALTER TABLE saas_meta_platform_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON saas_meta_platform_config;
CREATE POLICY "service_role_only" ON saas_meta_platform_config
  FOR ALL USING (auth.role() = 'service_role');

-- Per-tenant Instagram connection (OAuth tokens)
CREATE TABLE IF NOT EXISTS tenant_instagram_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facebook_page_id text NOT NULL,
  instagram_business_account_id text NOT NULL,
  page_access_token_encrypted text NOT NULL,
  token_expires_at timestamptz,
  ig_username text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tic_ig_biz_id ON tenant_instagram_connections (instagram_business_account_id);

COMMENT ON TABLE tenant_instagram_connections IS 'Per-tenant Instagram Business connection. Token is AES-encrypted.';

ALTER TABLE tenant_instagram_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_read_own" ON tenant_instagram_connections;
CREATE POLICY "tenant_read_own" ON tenant_instagram_connections
  FOR SELECT USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON tenant_instagram_connections;
CREATE POLICY "service_role_all" ON tenant_instagram_connections
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook deduplication
CREATE TABLE IF NOT EXISTS instagram_webhook_events (
  message_mid text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE instagram_webhook_events IS 'Idempotency: prevent duplicate processing of Meta webhook events.';

ALTER TABLE instagram_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON instagram_webhook_events;
CREATE POLICY "service_role_only" ON instagram_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- Channel activity (append-only, analytics + Realtime)
CREATE TABLE IF NOT EXISTS instagram_channel_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'dm' CHECK (channel IN ('dm', 'comment', 'story')),
  event_type text NOT NULL DEFAULT 'message_received',
  sender_ig_id text,
  lead_id uuid REFERENCES leads(id),
  latency_ms integer,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ica_tenant_created ON instagram_channel_activity (tenant_id, created_at DESC);

ALTER TABLE instagram_channel_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_read_own" ON instagram_channel_activity;
CREATE POLICY "tenant_read_own" ON instagram_channel_activity
  FOR SELECT USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON instagram_channel_activity;
CREATE POLICY "service_role_all" ON instagram_channel_activity
  FOR ALL USING (auth.role() = 'service_role');

-- Automation config (Phase 1: stub with settings jsonb)
CREATE TABLE IF NOT EXISTS instagram_automation_config (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{
    "channels": { "dm": { "enabled": true }, "comment": { "enabled": false }, "story": { "enabled": false } },
    "keyword_rules": [],
    "schedule": null,
    "conditions_defaults": {}
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_automation_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_read_own" ON instagram_automation_config;
CREATE POLICY "tenant_read_own" ON instagram_automation_config
  FOR SELECT USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "tenant_update_own" ON instagram_automation_config;
CREATE POLICY "tenant_update_own" ON instagram_automation_config
  FOR UPDATE USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON instagram_automation_config;
CREATE POLICY "service_role_all" ON instagram_automation_config
  FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for activity + connections (Overview live feed)
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_channel_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE tenant_instagram_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_automation_config;
