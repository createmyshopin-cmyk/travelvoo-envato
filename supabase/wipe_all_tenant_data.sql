-- =============================================================================
-- WIPE ALL TENANT-SCOPED DATA (destructive)
-- =============================================================================
-- Removes every row tied to public.tenants (all tenant accounts), in FK-safe order.
-- Does NOT delete:
--   - auth.users (Supabase Auth accounts remain; you can remove them manually in Dashboard)
--   - Platform rows: site_settings / stays / bookings / trips with tenant_id IS NULL
--   - saas_platform_settings, saas_meta_platform_config, plans, plan_features, marketplace_items
--
-- Run in Supabase SQL Editor as postgres or with a role that bypasses RLS (e.g. service role).
-- Review in a transaction first: BEGIN; ... ROLLBACK;
-- =============================================================================

BEGIN;

-- Bookings / finance
DELETE FROM public.accounting_transactions WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.booking_timeline WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.booking_ledger_entries WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.invoices WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.bookings WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.quotations WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Stays subtree
DELETE FROM public.calendar_pricing WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.add_ons WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.guest_wishlist WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.media
WHERE tenant_id IN (SELECT id FROM public.tenants)
   OR stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.reviews WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.nearby_destinations WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.stay_reels WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.room_categories WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.stay_addons WHERE stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Trips (tenant-owned only; platform trips stay tenant_id NULL)
DELETE FROM public.trip_dates WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trip_inclusions WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trip_itinerary_days WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trip_other_info WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trip_reviews WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trip_videos WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants));
DELETE FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Instagram / automation
DELETE FROM public.instagram_flow_executions WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_channel_activity WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_webhook_events WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_follower_cache WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_automation_schedules WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_automation_media_targets WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_automation_keyword_rules WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_automation_flows WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.instagram_automation_config WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Billing
DELETE FROM public.transactions WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.subscriptions WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Tenant satellite
DELETE FROM public.tenant_marketplace_installs WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.tenant_registrar_keys WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.tenant_domains WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.tenant_instagram_connections WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.tenant_usage WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Content & settings
DELETE FROM public.coupons WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.banners WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.menu_items WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.popup_settings WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.property_features WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.site_settings WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.stay_categories WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.leads WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.notifications WHERE tenant_id IN (SELECT id FROM public.tenants);
DELETE FROM public.ai_search_logs WHERE tenant_id IN (SELECT id FROM public.tenants);

-- Tenant root
DELETE FROM public.tenants;

COMMIT;

-- Afterward: optional — remove orphaned auth users in Dashboard → Authentication, or keep them and attach new tenants later.
