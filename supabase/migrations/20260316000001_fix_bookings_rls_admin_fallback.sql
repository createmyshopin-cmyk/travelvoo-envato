-- =============================================================================
-- Migration: Add admin fallback for bookings RLS
-- Date: 2026-03-16
-- Issue: When get_my_tenant_id() returns NULL (admin not linked to a tenant),
--        COALESCE(tenant_id, get_my_tenant_id()) stays NULL and is_tenant_admin(NULL)
--        is false → no rows returned.
-- Fix: Also allow users with admin role to see bookings where tenant_id IS NULL.
-- =============================================================================

DROP POLICY IF EXISTS "Tenant admin can manage own bookings" ON public.bookings;

CREATE POLICY "Tenant admin can manage own bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (
    (tenant_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id()))
  )
  WITH CHECK (
    (tenant_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))
    OR public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id()))
  );
