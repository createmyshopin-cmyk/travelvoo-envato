-- Support for Create Tenant Signup page
-- 1. Add phone_country_code to tenants for WhatsApp links (default India 91)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '91';

COMMENT ON COLUMN public.tenants.phone_country_code IS 'Country dial code for WhatsApp (e.g. 91=India, 971=UAE)';

-- 2. Allow public to check subdomain availability (anon/authenticated need to see if subdomain exists)
DROP POLICY IF EXISTS "Public can check subdomain availability" ON public.tenant_domains;
CREATE POLICY "Public can check subdomain availability"
  ON public.tenant_domains FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Ensure tenant admins can insert own domain on signup (get_my_tenant_id works after tenant insert)
DROP POLICY IF EXISTS "Tenant can manage own domains" ON public.tenant_domains;
CREATE POLICY "Tenant can manage own domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 4. Allow tenant admin to insert own tenant_usage row on signup (Tenant can view = SELECT only)
DROP POLICY IF EXISTS "Tenant can insert own usage" ON public.tenant_usage;
CREATE POLICY "Tenant can insert own usage"
  ON public.tenant_usage FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());
