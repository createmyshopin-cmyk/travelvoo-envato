-- =============================================================================
-- Migration: Fix bookings RLS for NULL tenant_id
-- Date: 2026-03-16
-- Issue: Bookings from stays with tenant_id=NULL (e.g. demo seed stays) get
--        tenant_id=NULL. is_tenant_admin(NULL) returns false, so admins can't see them.
-- Fix: Use COALESCE(tenant_id, get_my_tenant_id()) so NULL-tenant bookings
--      are visible to the logged-in tenant admin (same pattern as coupons).
-- =============================================================================

DROP POLICY IF EXISTS "Tenant admin can manage own bookings" ON public.bookings;

CREATE POLICY "Tenant admin can manage own bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id())))
  WITH CHECK (public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id())));
