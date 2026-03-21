-- Link auth user demo@demo.com to a public.tenants row so they appear on /saas-admin/tenants
-- and admin flows that join tenants.user_id / tenants.email work.
--
-- Prerequisites:
--   1. User exists: Authentication → Users → demo@demo.com (same password you use in the app).
--   2. At least one row in public.plans with status = 'active'.
--
-- Run in Supabase: SQL Editor → New query → paste → Run.

DO $$
DECLARE
  uid uuid;
  pid uuid;
  tid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'demo@demo.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user for demo@demo.com. Create the user under Authentication → Users first.';
  END IF;

  SELECT id INTO pid FROM public.plans WHERE status = 'active' ORDER BY price ASC LIMIT 1;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'No active plan in public.plans. Add a plan (e.g. SaaS admin → Plans) first.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE email = 'demo@demo.com' OR user_id = uid) THEN
    RAISE NOTICE 'Tenant already linked for demo@demo.com — nothing to do.';
    RETURN;
  END IF;

  INSERT INTO public.tenants (
    tenant_name,
    owner_name,
    email,
    phone,
    domain,
    user_id,
    plan_id,
    status
  ) VALUES (
    'Demo Property',
    'Demo Owner',
    'demo@demo.com',
    '',
    'demo',
    uid,
    pid,
    'active'
  )
  RETURNING id INTO tid;

  INSERT INTO public.tenant_usage (tenant_id) VALUES (tid);

  INSERT INTO public.subscriptions (
    tenant_id,
    plan_id,
    status,
    renewal_date,
    billing_cycle
  ) VALUES (
    tid,
    pid,
    'trial',
    (current_date + interval '14 days')::date,
    'monthly'
  );

  IF NOT EXISTS (SELECT 1 FROM public.tenant_domains WHERE subdomain = 'demo') THEN
    INSERT INTO public.tenant_domains (tenant_id, subdomain) VALUES (tid, 'demo');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT uid, 'admin'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = uid AND ur.role = 'admin'::public.app_role
  );

  RAISE NOTICE 'Created tenant % for demo@demo.com', tid;
END $$;
