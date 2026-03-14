-- Run this in Supabase Dashboard > SQL Editor to apply pending migrations
-- (Use when supabase db push fails due to migration order conflicts)

-- ========== 20260320000000: Seed subscriptions for tenants ==========
INSERT INTO public.subscriptions (tenant_id, plan_id, start_date, renewal_date, billing_cycle, status, payment_gateway)
SELECT t.id, p.id, COALESCE(t.created_at::date, CURRENT_DATE), (CURRENT_DATE + 30), 'monthly', COALESCE(t.status, 'trial'), ''
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.plans WHERE status = 'active' ORDER BY price ASC LIMIT 1
) p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id);

-- ========== 20260320000001: Sync tenant subscription status ==========
UPDATE public.tenants t
SET status = sub.status
FROM (
  SELECT DISTINCT ON (tenant_id) tenant_id, status
  FROM public.subscriptions
  ORDER BY tenant_id, created_at DESC NULLS LAST
) sub
WHERE t.id = sub.tenant_id
  AND t.status IS DISTINCT FROM sub.status
  AND t.status != 'suspended';

-- ========== 20260321000000: Fix features/plan_features RLS ==========
DROP POLICY IF EXISTS "Admins can manage features" ON public.features;
DROP POLICY IF EXISTS "Super admins can manage features" ON public.features;
CREATE POLICY "Super admins can manage features" ON public.features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can manage plan_features" ON public.plan_features;
DROP POLICY IF EXISTS "Super admins can manage plan_features" ON public.plan_features;
CREATE POLICY "Super admins can manage plan_features" ON public.plan_features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== 20260322000000: Create tenant signup support ==========
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '91';
COMMENT ON COLUMN public.tenants.phone_country_code IS 'Country dial code for WhatsApp (e.g. 91=India, 971=UAE)';

DROP POLICY IF EXISTS "Public can check subdomain availability" ON public.tenant_domains;
CREATE POLICY "Public can check subdomain availability"
  ON public.tenant_domains FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Tenant can manage own domains" ON public.tenant_domains;
CREATE POLICY "Tenant can manage own domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "Tenant can insert own usage" ON public.tenant_usage;
CREATE POLICY "Tenant can insert own usage"
  ON public.tenant_usage FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ========== 20260323000000: Grant admin from SaaS Tenants panel ==========
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ========== 20260324000000: Tenant uniqueness (no conflicts) ==========
-- Case-insensitive subdomain: prevents "GreenLeaf" and "greenleaf" as separate tenants
DROP INDEX IF EXISTS public.idx_tenant_domains_subdomain;
CREATE UNIQUE INDEX idx_tenant_domains_subdomain_lower
  ON public.tenant_domains (LOWER(subdomain)) WHERE subdomain != '';

-- Case-insensitive custom_domain: same for custom domains
DROP INDEX IF EXISTS public.idx_tenant_domains_custom;
CREATE UNIQUE INDEX idx_tenant_domains_custom_lower
  ON public.tenant_domains (LOWER(custom_domain)) WHERE custom_domain != '';
