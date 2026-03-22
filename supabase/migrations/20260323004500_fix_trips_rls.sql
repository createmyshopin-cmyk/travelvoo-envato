-- Fix High-Severity RLS Vulnerability in trips and related tables
-- Previous policies used `USING (true)` and `WITH CHECK (true)` for all authenticated users, exposing all tenant data.

-- ---------------------------------------------------------------------------
-- 1. DROP INSECURE POLICIES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated manage trips" ON public.trips;

DROP POLICY IF EXISTS "Public read trip_itinerary_days" ON public.trip_itinerary_days;
DROP POLICY IF EXISTS "Authenticated manage trip_itinerary_days" ON public.trip_itinerary_days;

DROP POLICY IF EXISTS "Public read trip_dates" ON public.trip_dates;
DROP POLICY IF EXISTS "Authenticated manage trip_dates" ON public.trip_dates;

DROP POLICY IF EXISTS "Public read trip_inclusions" ON public.trip_inclusions;
DROP POLICY IF EXISTS "Authenticated manage trip_inclusions" ON public.trip_inclusions;

DROP POLICY IF EXISTS "Public read trip_other_info" ON public.trip_other_info;
DROP POLICY IF EXISTS "Authenticated manage trip_other_info" ON public.trip_other_info;

DROP POLICY IF EXISTS "Public read trip_videos" ON public.trip_videos;
DROP POLICY IF EXISTS "Authenticated manage trip_videos" ON public.trip_videos;

DROP POLICY IF EXISTS "Public read trip_reviews" ON public.trip_reviews;
DROP POLICY IF EXISTS "Authenticated manage trip_reviews" ON public.trip_reviews;

-- ---------------------------------------------------------------------------
-- 2. SECURE POLICIES for "trips"
-- ---------------------------------------------------------------------------

-- Public/Anon read: Allowed. The application UI/code isolates trips per tenant by filtering explicitly by domain/slug.
CREATE POLICY "Public read trips" ON public.trips
  FOR SELECT USING (true);

-- Authenticated Manage: Must belong to tenant OR be a super admin
CREATE POLICY "Tenant manage trips"
  ON public.trips FOR ALL TO authenticated
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

-- ---------------------------------------------------------------------------
-- 3. SECURE POLICIES for dependent tables (trip_itinerary_days, etc.)
-- ---------------------------------------------------------------------------
-- These tables don't have a direct tenant_id, so we join against public.trips.

-- trip_itinerary_days
CREATE POLICY "Public read trip_itinerary_days" ON public.trip_itinerary_days FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_itinerary_days" ON public.trip_itinerary_days FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );

-- trip_dates
CREATE POLICY "Public read trip_dates" ON public.trip_dates FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_dates" ON public.trip_dates FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );

-- trip_inclusions
CREATE POLICY "Public read trip_inclusions" ON public.trip_inclusions FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_inclusions" ON public.trip_inclusions FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );

-- trip_other_info
CREATE POLICY "Public read trip_other_info" ON public.trip_other_info FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_other_info" ON public.trip_other_info FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );

-- trip_videos
CREATE POLICY "Public read trip_videos" ON public.trip_videos FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_videos" ON public.trip_videos FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );

-- trip_reviews
CREATE POLICY "Public read trip_reviews" ON public.trip_reviews FOR SELECT USING (true);
CREATE POLICY "Tenant manage trip_reviews" ON public.trip_reviews FOR ALL TO authenticated
  USING (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE tenant_id = public.get_my_tenant_id())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'::public.app_role)
  );
