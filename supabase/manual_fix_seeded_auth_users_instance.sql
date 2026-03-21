-- =============================================================================
-- Fix "Invalid login credentials" for users created via older SQL seeds that
-- used placeholder instance_id (00000000-...). GoTrue matches users to the
-- project's auth instance — misaligned instance_id can reject password login.
-- Run in Supabase Dashboard → SQL Editor (once per project, safe to re-run).
-- =============================================================================

DO $$
DECLARE
  v_inst uuid;
BEGIN
  SELECT id INTO v_inst FROM auth.instances LIMIT 1;
  IF v_inst IS NULL THEN
    RAISE NOTICE 'No row in auth.instances; nothing to fix.';
    RETURN;
  END IF;

  UPDATE auth.users u
  SET
    instance_id = v_inst,
    updated_at = now()
  WHERE u.email IN ('superadmin@stay.com', 'admin@travelvoo.demo')
    AND u.instance_id IS DISTINCT FROM v_inst;

  RAISE NOTICE 'Aligned instance_id for seeded demo users where needed.';
END $$;
