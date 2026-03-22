-- SaaS admin tenant delete failed: notifications still referenced tenants(id).
-- Cascade deletes in-app notification rows when a tenant is removed.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_tenant_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES public.tenants(id)
  ON DELETE CASCADE;
