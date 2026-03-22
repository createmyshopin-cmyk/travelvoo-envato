-- =============================================================================
-- WIPE ALL TENANT-SCOPED DATA (destructive)
-- =============================================================================
-- Removes every row tied to public.tenants (all SaaS tenant accounts), in FK-safe order.
-- Does NOT delete:
--   - auth.users (Supabase Auth accounts remain; you can remove them manually in Dashboard)
--   - The platform catalog tenant (tenants.is_platform = true) and its marketing data
--   - saas_platform_settings, saas_meta_platform_config, plans, plan_features, marketplace_items
--
-- Run in Supabase SQL Editor as postgres or with a role that bypasses RLS (e.g. service role).
-- Review in a transaction first: BEGIN; ... ROLLBACK;
-- =============================================================================

BEGIN;

-- Target only non-platform tenants (requires migration 20260324150000_platform_tenant_no_null_tenant_id.sql).
-- If is_platform is missing, COALESCE(is_platform, false) deletes all rows as before.

-- Bookings / finance
DELETE FROM public.accounting_transactions WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.booking_timeline WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.booking_ledger_entries WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.invoices WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.bookings WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.quotations WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Stays subtree
DELETE FROM public.calendar_pricing WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.add_ons WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.guest_wishlist WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.media
WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false))
   OR stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.reviews WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.nearby_destinations WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.stay_reels WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.room_categories WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.stay_addons WHERE stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.stays WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Trips (excludes platform catalog tenant)
DELETE FROM public.trip_dates WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trip_inclusions WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trip_itinerary_days WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trip_other_info WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trip_reviews WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trip_videos WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false)));
DELETE FROM public.trips WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Instagram / automation
DELETE FROM public.instagram_flow_executions WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_channel_activity WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_webhook_events WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_follower_cache WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_automation_schedules WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_automation_media_targets WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_automation_keyword_rules WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_automation_flows WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.instagram_automation_config WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Billing
DELETE FROM public.transactions WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.subscriptions WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Tenant satellite
DELETE FROM public.tenant_marketplace_installs WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.tenant_registrar_keys WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.tenant_domains WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.tenant_instagram_connections WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.tenant_usage WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Content & settings
DELETE FROM public.coupons WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.banners WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.menu_items WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.popup_settings WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.property_features WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.site_settings WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.stay_categories WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.leads WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.notifications WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));
DELETE FROM public.ai_search_logs WHERE tenant_id IN (SELECT id FROM public.tenants WHERE NOT COALESCE(is_platform, false));

-- Tenant root (keeps tenants.is_platform row)
DELETE FROM public.tenants WHERE NOT COALESCE(is_platform, false);

COMMIT;

-- Afterward: optional — remove orphaned auth users in Dashboard → Authentication, or keep them and attach new tenants later.
