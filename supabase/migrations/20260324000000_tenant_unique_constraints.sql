-- Ensure each tenant is unique: no conflicts on subdomain or custom_domain
-- Case-insensitive uniqueness so "GreenLeaf" and "greenleaf" cannot both exist

-- Replace subdomain unique index with case-insensitive version
DROP INDEX IF EXISTS public.idx_tenant_domains_subdomain;
CREATE UNIQUE INDEX idx_tenant_domains_subdomain_lower
  ON public.tenant_domains (LOWER(subdomain))
  WHERE subdomain != '';

-- Replace custom_domain unique index with case-insensitive version
DROP INDEX IF EXISTS public.idx_tenant_domains_custom;
CREATE UNIQUE INDEX idx_tenant_domains_custom_lower
  ON public.tenant_domains (LOWER(custom_domain))
  WHERE custom_domain != '';

-- One tenant_usage row per tenant (already UNIQUE on tenant_id)
-- One subscription per tenant for trial - enforced by business logic
COMMENT ON TABLE public.tenant_domains IS 'Each subdomain and custom_domain must be globally unique (case-insensitive)';
