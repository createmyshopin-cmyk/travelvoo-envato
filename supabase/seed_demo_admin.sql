-- =============================================================================
-- Demo Admin Seed
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/rqnxtcigfauzzjaqxzut/sql/new
-- Creates: admin@admin.com / admin.com
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_instance_id uuid;
BEGIN
  -- Get instance_id (Supabase project)
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- 1. Create auth user
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    email_change, phone_change, phone_change_token, reauthentication_token,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    'admin@admin.com',
    crypt('admin.com', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Demo Admin"}'::jsonb,
    '', '', '', '', '', '', '', '',
    now(),
    now()
  );

  -- 2. Create auth.identities (required for sign-in)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'admin@admin.com'),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 3. Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');

  -- 4. Create tenant (linked to this user)
  INSERT INTO public.tenants (
    tenant_name,
    owner_name,
    email,
    domain,
    status,
    user_id
  ) VALUES (
    'Demo Resort',
    'Demo Admin',
    'admin@admin.com',
    'demo-resort',
    'trial',
    v_user_id
  )
  RETURNING id INTO v_tenant_id;

  -- 5. Create tenant domain
  INSERT INTO public.tenant_domains (tenant_id, subdomain)
  VALUES (v_tenant_id, 'demo-resort');

  -- 6. Create tenant usage
  INSERT INTO public.tenant_usage (tenant_id)
  VALUES (v_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 7. Create subscription if plans exist
  INSERT INTO public.subscriptions (tenant_id, plan_id, status, billing_cycle, renewal_date)
  SELECT v_tenant_id, p.id, 'trial', 'monthly', (CURRENT_DATE + 14)
  FROM public.plans p
  WHERE p.status = 'active'
  ORDER BY p.price ASC
  LIMIT 1;

  RAISE NOTICE 'Demo admin created: admin@admin.com / admin.com';
END $$;
