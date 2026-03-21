-- Phase 3: Instagram advanced — follower check cache, conditions metadata

-- Follower check cache (short TTL, avoid rate limits)
CREATE TABLE IF NOT EXISTS instagram_follower_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_ig_id text NOT NULL,
  follows boolean,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sender_ig_id)
);

CREATE INDEX IF NOT EXISTS idx_ifc_tenant_sender ON instagram_follower_cache (tenant_id, sender_ig_id);

ALTER TABLE instagram_follower_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON instagram_follower_cache;
CREATE POLICY "service_role_only" ON instagram_follower_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Add follower_check columns to activity for analytics
ALTER TABLE instagram_channel_activity
  ADD COLUMN IF NOT EXISTS follower_check text;

COMMENT ON COLUMN instagram_channel_activity.follower_check IS 'follower | not_following | unknown | null (not checked)';

-- Add conditions_defaults to automation config if not already in jsonb
-- (no schema change needed — jsonb is flexible, but document the expected keys)
COMMENT ON TABLE instagram_automation_config IS 'Per-tenant automation config. settings.conditions_defaults: { require_follower, else_template }';
