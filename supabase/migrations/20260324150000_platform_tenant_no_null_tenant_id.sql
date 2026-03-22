-- Replace "marketing = tenant_id IS NULL" with an explicit platform tenant row.
-- After backfill, child rows reference public.tenants(id) for platform content too.

-- 1) Flag on tenants (at most one platform row)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS idx_tenants_one_platform;
CREATE UNIQUE INDEX idx_tenants_one_platform
  ON public.tenants (is_platform)
  WHERE is_platform = true;

COMMENT ON COLUMN public.tenants.is_platform IS
  'True for the single marketing / apex catalog tenant; not deleted by full-tenant wipes.';

-- 2) Platform tenant (no auth user — get_my_tenant_id stays null for guests)
INSERT INTO public.tenants (
  tenant_name,
  email,
  owner_name,
  phone,
  domain,
  status,
  is_platform
)
SELECT
  'Platform',
  'platform@internal.local',
  'Platform',
  '0',
  '__platform__',
  'active',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE is_platform = true);

-- 3) RPC for clients (anon + authenticated)
CREATE OR REPLACE FUNCTION public.get_platform_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE is_platform = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_tenant_id() TO anon, authenticated;

COMMENT ON FUNCTION public.get_platform_tenant_id() IS
  'UUID of the marketing-site tenant; use instead of tenant_id IS NULL.';

-- 4) Backfill: every nullable tenant_id becomes platform id
DO $$
DECLARE
  pid uuid;
BEGIN
  SELECT id INTO pid FROM public.tenants WHERE is_platform = true LIMIT 1;
  IF pid IS NULL THEN
    RAISE EXCEPTION 'platform tenant missing';
  END IF;

  UPDATE public.accounting_transactions SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.add_ons SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.ai_search_logs SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.banners SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.booking_ledger_entries SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.booking_timeline SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.bookings SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.calendar_pricing SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.coupons SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.guest_wishlist SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.invoices SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.leads SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.media SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.menu_items SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.nearby_destinations SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.notifications SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.popup_settings SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.property_features SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.quotations SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.reviews SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.room_categories SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.site_settings SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.stay_categories SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.stay_reels SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.stays SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.subscriptions SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.tenant_domains SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.tenant_instagram_connections SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.tenant_marketplace_installs SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.tenant_registrar_keys SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.tenant_usage SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.transactions SET tenant_id = pid WHERE tenant_id IS NULL;
  UPDATE public.trips SET tenant_id = pid WHERE tenant_id IS NULL;
END $$;

-- 5) Align rows that have a stay with the stay’s real tenant (fixes mixed platform backfill)
UPDATE public.bookings b
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE b.stay_id = s.id
  AND b.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.reviews r
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE r.stay_id = s.id
  AND r.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.guest_wishlist gw
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE gw.stay_id = s.id
  AND gw.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.stay_reels sr
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE sr.stay_id = s.id
  AND sr.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.room_categories rc
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE rc.stay_id = s.id
  AND rc.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.nearby_destinations nd
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE nd.stay_id = s.id
  AND nd.tenant_id IS DISTINCT FROM s.tenant_id;

UPDATE public.media m
SET tenant_id = s.tenant_id
FROM public.stays s
WHERE m.stay_id = s.id
  AND m.tenant_id IS DISTINCT FROM s.tenant_id;

-- 6) NOT NULL on tenant_id for core tables (explicit tenant on every row)
ALTER TABLE public.site_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.stays ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.trips ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.banners ALTER COLUMN tenant_id SET NOT NULL;

COMMENT ON COLUMN public.notifications.tenant_id IS
  'Owning tenant; use get_platform_tenant_id() for marketing-site rows.';
