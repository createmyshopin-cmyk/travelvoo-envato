-- Marketplace: catalog, tenant installs, theme columns, transaction metadata
-- Apply via Supabase SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- marketplace_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('theme', 'plugin')),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  version text NOT NULL DEFAULT '1.0.0',
  is_published boolean NOT NULL DEFAULT false,
  pricing_model text NOT NULL DEFAULT 'free' CHECK (pricing_model IN ('free', 'one_time', 'recurring')),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  billing_interval text CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly')),
  currency text NOT NULL DEFAULT 'INR',
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_image_url text,
  package_storage_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_recurring_interval CHECK (
    pricing_model <> 'recurring' OR billing_interval IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_published ON public.marketplace_items (is_published);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_type ON public.marketplace_items (type);

-- ---------------------------------------------------------------------------
-- tenant_marketplace_installs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_marketplace_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.marketplace_items (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'installed' CHECK (status IN ('pending_payment', 'installed', 'disabled')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_id uuid,
  razorpay_subscription_id text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_marketplace_installs_tenant ON public.tenant_marketplace_installs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_marketplace_installs_item ON public.tenant_marketplace_installs (item_id);

-- ---------------------------------------------------------------------------
-- site_settings: active landing theme (per existing single-row pattern)
-- ---------------------------------------------------------------------------
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS landing_theme_slug text,
  ADD COLUMN IF NOT EXISTS theme_tokens jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- transactions: marketplace linkage
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS marketplace_item_id uuid REFERENCES public.marketplace_items (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_marketplace_item ON public.transactions (marketplace_item_id)
  WHERE marketplace_item_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketplace_installs ENABLE ROW LEVEL SECURITY;

-- Helper: super_admin
-- Published catalog readable by any authenticated user (tenant admins browse marketplace)
DROP POLICY IF EXISTS "marketplace_items_select_published" ON public.marketplace_items;
CREATE POLICY "marketplace_items_select_published"
  ON public.marketplace_items FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "marketplace_items_all_super_admin" ON public.marketplace_items;
CREATE POLICY "marketplace_items_all_super_admin"
  ON public.marketplace_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

-- Tenant installs: own tenant only (get_my_tenant_id must exist in DB — same as other admin policies)
DROP POLICY IF EXISTS "tenant_marketplace_installs_select_own" ON public.tenant_marketplace_installs;
CREATE POLICY "tenant_marketplace_installs_select_own"
  ON public.tenant_marketplace_installs FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "tenant_marketplace_installs_insert_own" ON public.tenant_marketplace_installs;
CREATE POLICY "tenant_marketplace_installs_insert_own"
  ON public.tenant_marketplace_installs FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "tenant_marketplace_installs_update_own" ON public.tenant_marketplace_installs;
CREATE POLICY "tenant_marketplace_installs_update_own"
  ON public.tenant_marketplace_installs FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "tenant_marketplace_installs_delete_own" ON public.tenant_marketplace_installs;
CREATE POLICY "tenant_marketplace_installs_delete_own"
  ON public.tenant_marketplace_installs FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role
    )
  );

COMMENT ON TABLE public.marketplace_items IS 'Platform marketplace catalog (themes/plugins)';
COMMENT ON TABLE public.tenant_marketplace_installs IS 'Per-tenant marketplace installs';
