-- =============================================================================
-- FIX CROSS-TENANT DATA LEAK: PUBLIC SELECT POLICIES
-- =============================================================================
-- Root cause: Postgres permissive RLS ORs all matching policies.
-- The {public} SELECT policies (no role restriction) applied to authenticated
-- admins too, so admins saw ALL tenants' data when there was no tenant_id filter
-- in the public policy. Fix: restrict public SELECT policies to TO anon only.
-- Authenticated admins are scoped by the existing TO authenticated ALL policies
-- which use is_tenant_admin(tenant_id).
-- =============================================================================

-- stays
DROP POLICY IF EXISTS "Public can view active stays" ON public.stays;
CREATE POLICY "Public can view active stays"
  ON public.stays FOR SELECT TO anon USING (status = 'active');

-- room_categories
DROP POLICY IF EXISTS "Public can view room categories" ON public.room_categories;
CREATE POLICY "Public can view room categories"
  ON public.room_categories FOR SELECT TO anon USING (true);

-- nearby_destinations
DROP POLICY IF EXISTS "Public can view nearby_destinations" ON public.nearby_destinations;
CREATE POLICY "Public can view nearby_destinations"
  ON public.nearby_destinations FOR SELECT TO anon USING (true);

-- stay_reels
DROP POLICY IF EXISTS "Public can view stay_reels" ON public.stay_reels;
CREATE POLICY "Public can view stay_reels"
  ON public.stay_reels FOR SELECT TO anon USING (true);

-- stay_addons
DROP POLICY IF EXISTS "Public read stay_addons" ON public.stay_addons;
CREATE POLICY "Public read stay_addons"
  ON public.stay_addons FOR SELECT TO anon USING (true);

-- calendar_pricing
DROP POLICY IF EXISTS "Public can view calendar_pricing" ON public.calendar_pricing;
CREATE POLICY "Public can view calendar_pricing"
  ON public.calendar_pricing FOR SELECT TO anon USING (true);

-- coupons
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT TO anon USING (active = true);

-- add_ons
DROP POLICY IF EXISTS "Public can view active add_ons" ON public.add_ons;
CREATE POLICY "Public can view active add_ons"
  ON public.add_ons FOR SELECT TO anon USING (active = true);

-- media
DROP POLICY IF EXISTS "Public can view media" ON public.media;
CREATE POLICY "Public can view media"
  ON public.media FOR SELECT TO anon USING (true);

-- reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT TO anon USING (status = 'approved');

-- Fix reviews public INSERT: validate tenant_id matches stay's tenant
DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
CREATE POLICY "Public can submit reviews"
  ON public.reviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id = (
      SELECT s.tenant_id FROM public.stays s WHERE s.id = reviews.stay_id LIMIT 1
    )
  );

-- Fix banners: add tenant_id column and replace wide-open policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banners' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.banners ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    CREATE INDEX idx_banners_tenant ON public.banners(tenant_id);
  END IF;
END $$;

UPDATE public.banners
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

DROP POLICY IF EXISTS "Tenant can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Tenant admin can manage banners" ON public.banners;
CREATE POLICY "Tenant admin can manage banners"
  ON public.banners FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.is_tenant_admin(tenant_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Public can view banners" ON public.banners;
DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Public read banners"
  ON public.banners FOR SELECT TO anon USING (is_active = true);
