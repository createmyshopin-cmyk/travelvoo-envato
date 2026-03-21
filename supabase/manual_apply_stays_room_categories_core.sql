-- =============================================================================
-- Minimal stays + room_categories (for seeds and tenant-scoped admin)
-- Run if you see: relation "public.stays" does not exist
-- Prerequisites:
--   • manual_apply_user_roles_core.sql
--   • manual_apply_plans_tenants_core.sql (tenants table must exist for FK)
--   • get_my_tenant_id() / is_tenant_admin() from plans_tenants script
-- For a production DB, prefer full migrations or FULL_MIGRATION.sql instead.
-- =============================================================================

-- ─── stays ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id text UNIQUE NOT NULL,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  price integer NOT NULL DEFAULT 0,
  original_price integer NOT NULL DEFAULT 0,
  amenities text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS max_adults int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_children int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_pets int NOT NULL DEFAULT 5;

ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

CREATE INDEX IF NOT EXISTS idx_stays_tenant ON public.stays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stays_status ON public.stays(status);
CREATE INDEX IF NOT EXISTS idx_stays_category ON public.stays(category);

ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

-- ─── room_categories ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.room_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id uuid REFERENCES public.stays(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  max_guests integer NOT NULL DEFAULT 2,
  available integer NOT NULL DEFAULT 1,
  amenities text[] NOT NULL DEFAULT '{}',
  price integer NOT NULL DEFAULT 0,
  original_price integer NOT NULL DEFAULT 0,
  images text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.room_categories
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_room_categories_tenant ON public.room_categories(tenant_id);

ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

-- ─── RLS: public catalog (anon only) + tenant admin + super_admin ──────────
DROP POLICY IF EXISTS "Public can view active stays" ON public.stays;
DROP POLICY IF EXISTS "Admins can manage stays" ON public.stays;
DROP POLICY IF EXISTS "Tenant admin can manage own stays" ON public.stays;
DROP POLICY IF EXISTS "Super admins can manage all stays" ON public.stays;

CREATE POLICY "Public can view active stays"
  ON public.stays FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "Tenant admin can manage own stays"
  ON public.stays FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Super admins can manage all stays"
  ON public.stays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Public can view room categories" ON public.room_categories;
DROP POLICY IF EXISTS "Admins can manage room categories" ON public.room_categories;
DROP POLICY IF EXISTS "Tenant admin can manage own room categories" ON public.room_categories;
DROP POLICY IF EXISTS "Super admins can manage all room categories" ON public.room_categories;

CREATE POLICY "Public can view room categories"
  ON public.room_categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "Tenant admin can manage own room categories"
  ON public.room_categories FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Super admins can manage all room categories"
  ON public.room_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
