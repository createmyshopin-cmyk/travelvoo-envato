-- =============================================================================
-- Wipe tenant(s) for email admin@admin.com (and optional domain match)
-- =============================================================================
-- Matches: trim(lower(email)) = 'admin@admin.com', or domain contains admin.com
-- Edit the WHERE clause if your row uses a different stored email.
-- Run in Supabase SQL Editor (postgres / service role). Does NOT delete auth.users.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _wipe_admin_admin_tids ON COMMIT DROP AS
SELECT id
FROM public.tenants
WHERE trim(lower(email)) = 'admin@admin.com'
   OR lower(coalesce(domain, '')) LIKE '%admin@admin.com%';

-- Preview: SELECT * FROM _wipe_admin_admin_tids;

DELETE FROM public.accounting_transactions WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.booking_timeline WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.booking_ledger_entries WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.invoices WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.bookings WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.quotations WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.calendar_pricing WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.add_ons WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.guest_wishlist WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.media
WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids)
   OR stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.reviews WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.nearby_destinations WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.stay_reels WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.room_categories WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.stay_addons WHERE stay_id IN (SELECT id FROM public.stays WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.stays WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.trip_dates WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trip_inclusions WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trip_itinerary_days WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trip_other_info WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trip_reviews WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trip_videos WHERE trip_id IN (SELECT id FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids));
DELETE FROM public.trips WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.instagram_flow_executions WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_channel_activity WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_webhook_events WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_follower_cache WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_automation_schedules WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_automation_media_targets WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_automation_keyword_rules WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_automation_flows WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.instagram_automation_config WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.transactions WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.subscriptions WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.tenant_marketplace_installs WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.tenant_registrar_keys WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.tenant_domains WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.tenant_instagram_connections WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.tenant_usage WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.coupons WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.banners WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.menu_items WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.popup_settings WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.property_features WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.site_settings WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.stay_categories WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.leads WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.notifications WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);
DELETE FROM public.ai_search_logs WHERE tenant_id IN (SELECT id FROM _wipe_admin_admin_tids);

DELETE FROM public.tenants WHERE id IN (SELECT id FROM _wipe_admin_admin_tids);

COMMIT;
