-- stay_categories: tenant-scoped RLS (insert/update/delete were failing for tenant admins).
-- Aligns with public.banners and other tenant tables.

ALTER TABLE public.stay_categories ENABLE ROW LEVEL SECURITY;

-- Drop every policy on this table so we can replace with known-good rules.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stay_categories'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stay_categories', r.policyname);
  END LOOP;
END $$;

-- Public catalog: active rows (same idea as banners_select_anon_active)
CREATE POLICY "stay_categories_select_anon_active"
  ON public.stay_categories FOR SELECT TO anon
  USING (active = true);

-- Authenticated: own tenant or platform super_admin
CREATE POLICY "stay_categories_select_own"
  ON public.stay_categories FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

CREATE POLICY "stay_categories_insert_own"
  ON public.stay_categories FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

CREATE POLICY "stay_categories_update_own"
  ON public.stay_categories FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

CREATE POLICY "stay_categories_delete_own"
  ON public.stay_categories FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

COMMENT ON TABLE public.stay_categories IS 'Per-tenant stay category labels; RLS enforces tenant_id = get_my_tenant_id() for writes';
