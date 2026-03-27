-- =============================================================================
-- AUDIT: Tenant currency isolation (read-only, safe)
-- =============================================================================
-- Purpose:
--   - Verify SaaS default currency is stored in saas_platform_settings
--   - Verify tenant currencies are isolated in site_settings (one row per tenant)
--   - Flag suspicious patterns (for example: all tenant rows now share one currency)
--
-- Safety:
--   - This script does NOT update, insert, or delete any data.
--   - Safe to run in Supabase SQL Editor.
-- =============================================================================

-- 1) Platform default currency (source of truth for new tenants)
SELECT
  'platform_default_currency' AS section,
  sps.setting_value AS default_currency
FROM public.saas_platform_settings sps
WHERE sps.setting_key = 'default_currency';

-- 2) Per-tenant currency snapshot (include platform tenant marker)
SELECT
  t.id AS tenant_id,
  t.tenant_name,
  COALESCE(t.is_platform, false) AS is_platform,
  ss.currency,
  ss.updated_at
FROM public.site_settings ss
JOIN public.tenants t
  ON t.id = ss.tenant_id
ORDER BY COALESCE(t.is_platform, false) DESC, t.tenant_name NULLS LAST, t.id;

-- 3) Distribution by currency (non-platform tenants only)
SELECT
  ss.currency,
  COUNT(*) AS tenant_count
FROM public.site_settings ss
JOIN public.tenants t
  ON t.id = ss.tenant_id
WHERE NOT COALESCE(t.is_platform, false)
GROUP BY ss.currency
ORDER BY tenant_count DESC, ss.currency;

-- 4) Health checks (single row output for quick status)
WITH platform_default AS (
  SELECT setting_value AS default_currency
  FROM public.saas_platform_settings
  WHERE setting_key = 'default_currency'
  LIMIT 1
),
tenant_rows AS (
  SELECT
    t.id AS tenant_id,
    ss.currency
  FROM public.tenants t
  LEFT JOIN public.site_settings ss
    ON ss.tenant_id = t.id
  WHERE NOT COALESCE(t.is_platform, false)
),
stats AS (
  SELECT
    COUNT(*)::int AS non_platform_tenant_count,
    COUNT(currency)::int AS tenants_with_site_settings,
    COUNT(*) FILTER (WHERE currency IS NULL)::int AS tenants_missing_site_settings,
    COUNT(DISTINCT currency)::int AS distinct_tenant_currencies
  FROM tenant_rows
)
SELECT
  pd.default_currency,
  s.non_platform_tenant_count,
  s.tenants_with_site_settings,
  s.tenants_missing_site_settings,
  s.distinct_tenant_currencies,
  CASE
    WHEN s.tenants_missing_site_settings > 0 THEN 'WARN: some tenants do not have site_settings rows'
    WHEN s.non_platform_tenant_count > 1 AND s.distinct_tenant_currencies = 1 THEN 'WARN: all non-platform tenants currently share one currency (review if expected)'
    ELSE 'OK'
  END AS audit_status
FROM stats s
CROSS JOIN platform_default pd;

-- 5) Optional: tenants that currently equal platform default (for manual review)
WITH platform_default AS (
  SELECT setting_value AS default_currency
  FROM public.saas_platform_settings
  WHERE setting_key = 'default_currency'
  LIMIT 1
)
SELECT
  t.id AS tenant_id,
  t.tenant_name,
  ss.currency,
  ss.updated_at
FROM public.site_settings ss
JOIN public.tenants t
  ON t.id = ss.tenant_id
CROSS JOIN platform_default pd
WHERE NOT COALESCE(t.is_platform, false)
  AND ss.currency = pd.default_currency
ORDER BY ss.updated_at DESC NULLS LAST, t.tenant_name NULLS LAST;

