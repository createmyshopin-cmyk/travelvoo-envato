-- =============================================================================
-- Minimal SaaS tables: plans, tenants, tenant_domains, subscriptions, usage
-- Run BEFORE seed_admin_saas_stays.sql if you see:
--   relation "public.tenants" does not exist
-- Prerequisites:
--   • manual_apply_user_roles_core.sql (app_role, user_roles, has_role)
-- After this, you still need the rest of the app schema (stays, room_categories,
-- bookings, …) — use supabase/FULL_MIGRATION.sql or `supabase db push` if those
-- tables are missing too.
-- =============================================================================

-- ─── plans ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  max_stays integer NOT NULL DEFAULT 1,
  max_rooms integer NOT NULL DEFAULT 10,
  max_bookings_per_month integer NOT NULL DEFAULT 50,
  max_ai_search integer NOT NULL DEFAULT 100,
  feature_flags jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

INSERT INTO public.plans (plan_name, price, billing_cycle, max_stays, max_rooms, max_bookings_per_month, max_ai_search, feature_flags, status)
SELECT 'Starter', 999, 'monthly', 1, 10, 50, 100, '{"ai_search": false, "coupons": false, "invoice_generator": true, "quotation_generator": true}'::jsonb, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_name = 'Starter' LIMIT 1);

INSERT INTO public.plans (plan_name, price, billing_cycle, max_stays, max_rooms, max_bookings_per_month, max_ai_search, feature_flags, status)
SELECT 'Pro', 2999, 'monthly', 5, 50, 500, 1000, '{"ai_search": true, "coupons": true, "invoice_generator": true, "quotation_generator": true, "reels": true, "dynamic_pricing": true}'::jsonb, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_name = 'Pro' LIMIT 1);

INSERT INTO public.plans (plan_name, price, billing_cycle, max_stays, max_rooms, max_bookings_per_month, max_ai_search, feature_flags, status)
SELECT 'Enterprise', 6999, 'monthly', -1, -1, -1, -1, '{"ai_search": true, "coupons": true, "invoice_generator": true, "quotation_generator": true, "reels": true, "dynamic_pricing": true, "custom_domain": true, "analytics": true}'::jsonb, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE plan_name = 'Enterprise' LIMIT 1);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Public can read active plans" ON public.plans;
DROP POLICY IF EXISTS "Super admins can manage plans" ON public.plans;
CREATE POLICY "Public can read active plans"
  ON public.plans FOR SELECT USING (status = 'active');
CREATE POLICY "Super admins can manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ─── tenants ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name text NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ─── tenant_domains ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  subdomain text NOT NULL DEFAULT '',
  custom_domain text NOT NULL DEFAULT '',
  ssl_status text NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS public.idx_tenant_domains_subdomain;
DROP INDEX IF EXISTS public.idx_tenant_domains_custom;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_domains_subdomain_lower
  ON public.tenant_domains (LOWER(subdomain))
  WHERE subdomain <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_domains_custom_lower
  ON public.tenant_domains (LOWER(custom_domain))
  WHERE custom_domain <> '';

-- ─── subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.plans(id) NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  renewal_date date,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'trial',
  payment_gateway text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scheduled_plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ─── tenant_usage ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stays_created integer NOT NULL DEFAULT 0,
  rooms_created integer NOT NULL DEFAULT 0,
  bookings_this_month integer NOT NULL DEFAULT 0,
  ai_search_count integer NOT NULL DEFAULT 0,
  storage_used bigint NOT NULL DEFAULT 0,
  last_reset timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

-- ─── transactions (subscriptions FK not required for seed; table expected by app) ──
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  payment_gateway text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ─── helpers (required for tenant RLS) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id AND user_id = auth.uid()
  );
$$;

-- ─── RLS policies (tenant + super_admin) ─────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant can view and update own record" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Tenant can view and update own record"
  ON public.tenants FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenant can view own subscription" ON public.subscriptions;
CREATE POLICY "Super admins can manage all subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Tenant can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Admins can manage tenant_usage" ON public.tenant_usage;
DROP POLICY IF EXISTS "Super admins can manage tenant_usage" ON public.tenant_usage;
DROP POLICY IF EXISTS "Tenant can view own usage" ON public.tenant_usage;
CREATE POLICY "Super admins can manage tenant_usage"
  ON public.tenant_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Tenant can view own usage"
  ON public.tenant_usage FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Tenant can insert own usage" ON public.tenant_usage;
CREATE POLICY "Tenant can insert own usage"
  ON public.tenant_usage FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Admins can manage tenant_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Super admins can manage tenant_domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Public can read verified domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Public can check subdomain availability" ON public.tenant_domains;
DROP POLICY IF EXISTS "Tenant can manage own domains" ON public.tenant_domains;
CREATE POLICY "Public can check subdomain availability"
  ON public.tenant_domains FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Super admins can manage tenant_domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY "Tenant can manage own domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Super admins can manage all transactions" ON public.transactions;
CREATE POLICY "Super admins can manage all transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
