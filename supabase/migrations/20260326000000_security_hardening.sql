-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- Fixes: R-1, R-2, R-3, R-4, R-5, R-6, R-7, S-2
-- =============================================================================

-- ---------------------------------------------------------------------------
-- R-1 CRITICAL: Fix bookings SELECT — scope to tenant only
-- The 20260317000001 migration opened SELECT to ALL admins across ALL tenants.
-- Restore the correct tenant-scoped policy.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin role can select all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Tenant admin can select own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Super admins can select all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings: tenant admin select" ON public.bookings;
DROP POLICY IF EXISTS "Bookings: super admin select all" ON public.bookings;
DROP POLICY IF EXISTS "Tenant admin can view own bookings" ON public.bookings;

CREATE POLICY "Bookings: tenant admin select"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ---------------------------------------------------------------------------
-- R-2 HIGH: Restrict user_roles management to super_admin only
-- Currently any admin can grant super_admin to themselves.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;

CREATE POLICY "Super admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Also keep read policy so admins can read their own role
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- R-3 HIGH: Fix 5 tables that use generic has_role(admin) instead of
-- is_tenant_admin(tenant_id) — cross-tenant read/write was possible.
-- ---------------------------------------------------------------------------

-- stay_categories
DROP POLICY IF EXISTS "Admins can manage stay_categories" ON public.stay_categories;
DROP POLICY IF EXISTS "Tenant admin manage stay_categories" ON public.stay_categories;
CREATE POLICY "Tenant admin manage stay_categories"
  ON public.stay_categories FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- menu_items
DROP POLICY IF EXISTS "Admins can manage menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Tenant admin manage menu_items" ON public.menu_items;
CREATE POLICY "Tenant admin manage menu_items"
  ON public.menu_items FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- property_features
DROP POLICY IF EXISTS "Admins can manage property_features" ON public.property_features;
DROP POLICY IF EXISTS "Tenant admin manage property_features" ON public.property_features;
CREATE POLICY "Tenant admin manage property_features"
  ON public.property_features FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- popup_settings
DROP POLICY IF EXISTS "Admins can manage popup_settings" ON public.popup_settings;
DROP POLICY IF EXISTS "Tenant admin manage popup_settings" ON public.popup_settings;
CREATE POLICY "Tenant admin manage popup_settings"
  ON public.popup_settings FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- tenant_registrar_keys (API secrets — highest priority)
DROP POLICY IF EXISTS "Admins can manage tenant_registrar_keys" ON public.tenant_registrar_keys;
DROP POLICY IF EXISTS "Tenant admin manage registrar_keys" ON public.tenant_registrar_keys;
CREATE POLICY "Tenant admin manage registrar_keys"
  ON public.tenant_registrar_keys FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ---------------------------------------------------------------------------
-- R-4 HIGH: Add tenant_id to site_settings so each tenant has their own row.
-- Existing global row stays; new tenants get their own via trigger.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_settings' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.site_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    CREATE INDEX idx_site_settings_tenant ON public.site_settings(tenant_id);
  END IF;
END $$;

-- Assign the existing global row to the first/only existing tenant if there is one
-- (safe no-op if table is empty or already has tenant_id)
UPDATE public.site_settings
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

-- Drop old open policies and replace with tenant-scoped ones
DROP POLICY IF EXISTS "Admins can manage site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Tenant admin manage site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;

CREATE POLICY "Tenant admin manage site_settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_tenant_admin(tenant_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Public read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Auto-create a site_settings row for new tenants
CREATE OR REPLACE FUNCTION public.create_tenant_site_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.site_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_tenant_site_settings ON public.tenants;
CREATE TRIGGER trg_create_tenant_site_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.create_tenant_site_settings();

-- ---------------------------------------------------------------------------
-- R-5 MEDIUM: Fix stay_addons — scope manage to tenant via stay_id → stays
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth manage stay_addons" ON public.stay_addons;
DROP POLICY IF EXISTS "Tenant admin manage stay_addons" ON public.stay_addons;

CREATE POLICY "Tenant admin manage stay_addons"
  ON public.stay_addons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stays s
      WHERE s.id = stay_addons.stay_id
        AND (
          public.is_tenant_admin(s.tenant_id)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stays s
      WHERE s.id = stay_addons.stay_id
        AND (
          public.is_tenant_admin(s.tenant_id)
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- R-6 MEDIUM: Remove anonymous INSERT from booking_timeline
-- Edge functions use service role (bypasses RLS) so this is unnecessary.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert timeline entries" ON public.booking_timeline;

-- ---------------------------------------------------------------------------
-- R-7 MEDIUM: Scope public booking INSERT — prevent cross-tenant pollution.
-- Validate that tenant_id matches the stay's actual tenant.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

CREATE POLICY "Public can create bookings"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- tenant_id must match the stay's actual tenant (prevents fake tenant_id injection)
    tenant_id = (
      SELECT s.tenant_id FROM public.stays s WHERE s.id = bookings.stay_id LIMIT 1
    )
  );

-- ---------------------------------------------------------------------------
-- S-2 LOW: Allow anonymous reads of the subdomain suffix setting key only.
-- Needed so CreateTenantSignup.tsx can display the correct suffix.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon read platform subdomain suffix" ON public.saas_platform_settings;
DROP POLICY IF EXISTS "Public read platform subdomain suffix" ON public.saas_platform_settings;

CREATE POLICY "Public read platform subdomain suffix"
  ON public.saas_platform_settings
  FOR SELECT
  USING (setting_key = 'platform_subdomain_suffix');
