-- Sync tenant status from their latest subscription (fixes mismatch between Tenants and Subscriptions pages)
UPDATE public.tenants t
SET status = sub.status
FROM (
  SELECT DISTINCT ON (tenant_id) tenant_id, status
  FROM public.subscriptions
  ORDER BY tenant_id, created_at DESC NULLS LAST
) sub
WHERE t.id = sub.tenant_id
  AND t.status IS DISTINCT FROM sub.status
  AND t.status != 'suspended';
