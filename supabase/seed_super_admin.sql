-- =============================================================================
-- Seed Super Admin user for SaaS Admin Panel
-- Login: superadmin@stay.com / superadmin123
-- URL:   /saas-admin/login
-- Run in Supabase Dashboard → SQL Editor (select your project first).
-- Prerequisite: if you see "relation public.user_roles does not exist", run first:
--   supabase/manual_apply_user_roles_core.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_existing_id uuid;
BEGIN
  -- Check if super admin already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'superadmin@stay.com' LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Just ensure the role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_existing_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Confirm email
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_existing_id;

    RAISE NOTICE 'Super admin already exists. Role confirmed for %', v_existing_id;
    RETURN;
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'superadmin@stay.com',
    crypt('superadmin123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Super Admin"}',
    false,
    'authenticated'
  );

  -- Create identity
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'superadmin@stay.com',
    jsonb_build_object('sub', v_user_id::text, 'email', 'superadmin@stay.com'),
    'email',
    now(), now(), now()
  );

  -- Grant super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super admin created successfully! ID: %', v_user_id;
END $$;
