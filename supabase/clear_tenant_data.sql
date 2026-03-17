-- =============================================================================
-- Clear all data for a tenant (fresh account reset)
-- Run in Supabase Dashboard > SQL Editor
--
-- IMPORTANT: Select and copy the ENTIRE file (including "DO $body$" on line 10)
--            then paste and Run. Do NOT run partial snippets.
--
-- Usage: Replace 'dude' with the tenant subdomain you want to reset.
-- =============================================================================

DO $body$
DECLARE
  p_subdomain text := 'dude';  -- Change to target tenant subdomain
  v_tenant_id uuid;
  v_stay_ids uuid[];
  v_count bigint;
BEGIN
  -- Resolve tenant_id from subdomain
  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  JOIN public.tenant_domains td ON td.tenant_id = t.id
  WHERE LOWER(td.subdomain) = LOWER(p_subdomain)
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found for subdomain: %', p_subdomain;
  END IF;

  -- Collect stay IDs for this tenant
  SELECT ARRAY_AGG(id) INTO v_stay_ids
  FROM public.stays WHERE tenant_id = v_tenant_id;

  v_stay_ids := COALESCE(v_stay_ids, ARRAY[]::uuid[]);

  RAISE NOTICE 'Clearing data for tenant % (subdomain: %)', v_tenant_id, p_subdomain;

  -- 1. Accounting / ledger (before bookings)
  DELETE FROM public.accounting_transactions WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  accounting_transactions: %', v_count;

  DELETE FROM public.booking_ledger_entries WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  booking_ledger_entries: %', v_count;

  DELETE FROM public.booking_timeline WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  booking_timeline: %', v_count;

  -- 2. Billing / finance
  DELETE FROM public.transactions WHERE tenant_id = v_tenant_id;
  DELETE FROM public.invoices WHERE tenant_id = v_tenant_id;
  DELETE FROM public.quotations WHERE tenant_id = v_tenant_id;
  DELETE FROM public.coupons WHERE tenant_id = v_tenant_id;

  -- 3. Bookings
  DELETE FROM public.bookings WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  bookings: %', v_count;

  -- 4. Calendar & add-ons
  DELETE FROM public.calendar_pricing WHERE tenant_id = v_tenant_id;
  DELETE FROM public.calendar_pricing WHERE stay_id = ANY(v_stay_ids);
  DELETE FROM public.stay_addons WHERE stay_id = ANY(v_stay_ids);
  DELETE FROM public.add_ons WHERE tenant_id = v_tenant_id;

  -- 5. Reels, reviews, media
  DELETE FROM public.stay_reels WHERE tenant_id = v_tenant_id;
  DELETE FROM public.stay_reels WHERE stay_id = ANY(v_stay_ids);
  DELETE FROM public.reviews WHERE tenant_id = v_tenant_id;
  DELETE FROM public.media WHERE tenant_id = v_tenant_id;

  -- 6. Nearby destinations, search logs
  DELETE FROM public.nearby_destinations WHERE tenant_id = v_tenant_id;
  DELETE FROM public.ai_search_logs WHERE tenant_id = v_tenant_id;

  -- 7. Room categories (before stays — or cascade will handle when we delete stays)
  DELETE FROM public.room_categories WHERE tenant_id = v_tenant_id;
  DELETE FROM public.room_categories WHERE stay_id = ANY(v_stay_ids);

  -- 8. Stays (last — cascades to room_categories, calendar_pricing, stay_addons, etc.)
  DELETE FROM public.stays WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  stays: %', v_count;

  RAISE NOTICE 'Done. Tenant % is now a fresh account.', p_subdomain;
END $body$;
