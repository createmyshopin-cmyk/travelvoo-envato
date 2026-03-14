-- Ensure every tenant has at least one subscription (fixes empty Subscriptions page)
INSERT INTO public.subscriptions (tenant_id, plan_id, start_date, renewal_date, billing_cycle, status, payment_gateway)
SELECT t.id, p.id, COALESCE(t.created_at::date, CURRENT_DATE), (CURRENT_DATE + 30), 'monthly', COALESCE(t.status, 'trial'), ''
FROM public.tenants t
CROSS JOIN LATERAL (
  SELECT id FROM public.plans WHERE status = 'active' ORDER BY price ASC LIMIT 1
) p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.tenant_id = t.id);
