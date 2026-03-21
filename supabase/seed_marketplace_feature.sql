-- Marketplace feature: catalog row, per-plan toggles, and plan JSON flags.
-- Run in Supabase SQL Editor (or `supabase db execute`) after your schema exists.

-- 1) Feature definition (SaaS Admin → Features matrix)
INSERT INTO public.features (id, feature_key, feature_name, description, status)
SELECT gen_random_uuid(), 'marketplace', 'Marketplace', 'Marketplace tab on the tenant admin dashboard.', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.features WHERE feature_key = 'marketplace');

-- 2) Enable for each plan in plan_features (SaaS Admin → Features)
INSERT INTO public.plan_features (id, plan_id, feature_key, enabled)
SELECT gen_random_uuid(), p.id, 'marketplace', true
FROM public.plans p
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_features pf
  WHERE pf.plan_id = p.id AND pf.feature_key = 'marketplace'
);

-- 3) Merge into plans.feature_flags (used by tenant admin / subscription guard) when key is absent
UPDATE public.plans
SET feature_flags = COALESCE(feature_flags::jsonb, '{}'::jsonb) || '{"marketplace": true}'::jsonb
WHERE NOT (COALESCE(feature_flags::jsonb, '{}'::jsonb) ? 'marketplace');
