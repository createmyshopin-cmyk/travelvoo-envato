import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  loading: boolean;
  /** true when the URL is a subdomain that has no registered tenant */
  notFound: boolean;
  setTenantId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantName: null,
  loading: true,
  notFound: false,
  setTenantId: () => {},
});

export const useTenant = () => useContext(TenantContext);

interface ResolveResult {
  tenant: { id: string; name: string } | null;
  /** true when the current URL is on a subdomain (not the root domain or a preview URL) */
  isSubdomain: boolean;
}

/**
 * Resolves tenant from:
 * 1. Custom domain match in tenant_domains table (e.g., tajresort.com)
 * 2. Subdomain match in tenant_domains table (e.g., taj from taj.easystay.com)
 * 3. Returns null tenant — caller distinguishes "root domain" vs "unknown subdomain"
 *    via the `isSubdomain` flag.
 */
async function resolveTenant(): Promise<ResolveResult> {
  const hostname = window.location.hostname;

  // Skip for localhost / preview domains — treat as root (no subdomain)
  if (
    hostname === "localhost" ||
    hostname.includes("lovable.app") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("vercel.app")
  ) {
    return { tenant: null, isSubdomain: false };
  }

  // Step 1: Try exact custom domain match in tenant_domains
  const { data: domainMatch } = await supabase
    .from("tenant_domains")
    .select("tenant_id, tenants(id, tenant_name)")
    .eq("custom_domain", hostname)
    .eq("verified", true)
    .limit(1)
    .single();

  if (domainMatch?.tenant_id) {
    const tenant = domainMatch.tenants as { id: string; tenant_name: string } | null;
    return { tenant: { id: domainMatch.tenant_id, name: tenant?.tenant_name ?? "" }, isSubdomain: false };
  }

  // Step 2: Try subdomain match (e.g., "taj" from "taj.easystay.com")
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // "www" is the canonical main-domain prefix — never treat it as a tenant
    if (subdomain === "www") {
      return { tenant: null, isSubdomain: false };
    }

    const { data: subMatch } = await supabase
      .from("tenant_domains")
      .select("tenant_id, tenants(id, tenant_name)")
      .eq("subdomain", subdomain)
      .limit(1)
      .single();

    if (subMatch?.tenant_id) {
      const tenant = subMatch.tenants as { id: string; tenant_name: string } | null;
      return { tenant: { id: subMatch.tenant_id, name: tenant?.tenant_name ?? "" }, isSubdomain: true };
    }

    // On a subdomain but no tenant matched — signal "not found"
    return { tenant: null, isSubdomain: true };
  }

  // Root domain, no tenant
  return { tenant: null, isSubdomain: false };
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    resolveTenant().then(({ tenant, isSubdomain }) => {
      if (tenant) {
        setTenantId(tenant.id);
        setTenantName(tenant.name);
      } else if (isSubdomain) {
        // On a real subdomain with no registered tenant
        setNotFound(true);
      }
      setLoading(false);
    });
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, tenantName, loading, notFound, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}
