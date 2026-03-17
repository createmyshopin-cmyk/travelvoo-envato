-- =============================================================================
-- Clear all data for a tenant (fresh account reset) — Plain SQL version
-- Run in Supabase Dashboard > SQL Editor
--
-- Usage: Replace 'dude' in each subquery with your tenant subdomain.
-- =============================================================================

-- Resolve tenant_id (change 'dude' to your subdomain)
-- Run all statements below as one batch (select all, then Run)

DELETE FROM public.accounting_transactions
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.booking_ledger_entries
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.booking_timeline
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.transactions
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.invoices
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.quotations
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.coupons
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.bookings
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.calendar_pricing
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1)
   OR stay_id IN (SELECT s.id FROM public.stays s JOIN public.tenants t ON s.tenant_id = t.id JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude');

DELETE FROM public.stay_addons
WHERE stay_id IN (SELECT s.id FROM public.stays s JOIN public.tenants t ON s.tenant_id = t.id JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude');

DELETE FROM public.add_ons
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.stay_reels
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1)
   OR stay_id IN (SELECT s.id FROM public.stays s JOIN public.tenants t ON s.tenant_id = t.id JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude');

DELETE FROM public.reviews
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.media
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.nearby_destinations
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.ai_search_logs
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);

DELETE FROM public.room_categories
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1)
   OR stay_id IN (SELECT s.id FROM public.stays s JOIN public.tenants t ON s.tenant_id = t.id JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude');

DELETE FROM public.stays
WHERE tenant_id = (SELECT t.id FROM public.tenants t JOIN public.tenant_domains td ON td.tenant_id = t.id WHERE LOWER(td.subdomain) = 'dude' LIMIT 1);
