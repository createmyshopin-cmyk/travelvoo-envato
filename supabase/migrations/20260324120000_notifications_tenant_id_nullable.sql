-- Platform stays (tenant_id IS NULL) still enqueue booking notifications from triggers/RPC.
-- Storing tenant_id as NULL matches bookings/stays for marketing-site listings and avoids NOT NULL violations.
ALTER TABLE public.notifications
  ALTER COLUMN tenant_id DROP NOT NULL;

COMMENT ON COLUMN public.notifications.tenant_id IS
  'Owning tenant for in-app alerts; NULL when the booking is for a platform (non-tenant) stay.';
