-- Banners: tenant_id + RLS so tenant admins can insert/update/delete hero/promo rows.
-- Run after public.banners exists. Safe to re-run: IF NOT EXISTS / DROP IF EXISTS.

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_banners_tenant_id ON public.banners (tenant_id);

-- Backfill: prefer site_settings.tenant_id, else first tenant
UPDATE public.banners b
SET tenant_id = (
  SELECT ss.tenant_id FROM public.site_settings ss
  WHERE ss.tenant_id IS NOT NULL
  LIMIT 1
)
WHERE b.tenant_id IS NULL;

UPDATE public.banners
SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_select_anon_active" ON public.banners;
DROP POLICY IF EXISTS "banners_select_own_tenant" ON public.banners;
DROP POLICY IF EXISTS "banners_insert_own_tenant" ON public.banners;
DROP POLICY IF EXISTS "banners_update_own_tenant" ON public.banners;
DROP POLICY IF EXISTS "banners_delete_own_tenant" ON public.banners;

-- Public landing: read active rows (app still scopes by tenant via data layout in single-tenant setups)
CREATE POLICY "banners_select_anon_active"
  ON public.banners FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "banners_select_own_tenant"
  ON public.banners FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

CREATE POLICY "banners_insert_own_tenant"
  ON public.banners FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

CREATE POLICY "banners_update_own_tenant"
  ON public.banners FOR UPDATE TO authenticated
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

CREATE POLICY "banners_delete_own_tenant"
  ON public.banners FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

COMMENT ON COLUMN public.banners.tenant_id IS 'Owning tenant; required for admin writes under RLS';
