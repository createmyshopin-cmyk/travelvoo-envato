-- Phase 2: Instagram automations — media targets, keyword rules, schedules

-- Media targets (which posts/reels run comment automation)
CREATE TABLE IF NOT EXISTS instagram_automation_media_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ig_media_id text NOT NULL,
  media_product_type text DEFAULT 'FEED',
  caption text,
  permalink text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ig_media_id)
);

CREATE INDEX IF NOT EXISTS idx_iamt_tenant ON instagram_automation_media_targets (tenant_id, enabled);

ALTER TABLE instagram_automation_media_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_manage_own" ON instagram_automation_media_targets;
CREATE POLICY "tenant_manage_own" ON instagram_automation_media_targets
  FOR ALL USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON instagram_automation_media_targets;
CREATE POLICY "service_role_all" ON instagram_automation_media_targets
  FOR ALL USING (auth.role() = 'service_role');

-- Keyword rules (optional dedicated table)
CREATE TABLE IF NOT EXISTS instagram_automation_keyword_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'dm' CHECK (channel IN ('dm', 'comment', 'story')),
  match text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains', 'whole_word', 'exact')),
  case_sensitive boolean NOT NULL DEFAULT false,
  action text NOT NULL DEFAULT 'ai_reply' CHECK (action IN ('ai_reply', 'template_reply', 'send_link', 'suppress', 'qualify_lead_only')),
  template_text text,
  url text,
  priority integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iakr_tenant_channel ON instagram_automation_keyword_rules (tenant_id, channel, priority);

ALTER TABLE instagram_automation_keyword_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_manage_own" ON instagram_automation_keyword_rules;
CREATE POLICY "tenant_manage_own" ON instagram_automation_keyword_rules
  FOR ALL USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON instagram_automation_keyword_rules;
CREATE POLICY "service_role_all" ON instagram_automation_keyword_rules
  FOR ALL USING (auth.role() = 'service_role');

-- Schedules (dedicated table for complex scheduling)
CREATE TABLE IF NOT EXISTS instagram_automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  weekly_rules jsonb NOT NULL DEFAULT '[]',
  quiet_hours jsonb DEFAULT '{}',
  campaigns jsonb DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE instagram_automation_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_manage_own" ON instagram_automation_schedules;
CREATE POLICY "tenant_manage_own" ON instagram_automation_schedules
  FOR ALL USING (tenant_id = (SELECT get_my_tenant_id()));
DROP POLICY IF EXISTS "service_role_all" ON instagram_automation_schedules;
CREATE POLICY "service_role_all" ON instagram_automation_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_automation_media_targets;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_automation_keyword_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_automation_schedules;
