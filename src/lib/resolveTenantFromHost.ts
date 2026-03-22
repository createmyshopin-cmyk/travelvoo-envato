import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedTenantFromHost {
  tenant: { id: string; name: string } | null;
  /** true when the URL is a tenant subdomain (e.g. demo.*) but no row matched */
  isSubdomain: boolean;
}

function envPlatformBaseDomains(): string[] {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN : undefined;
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

let cachedPlatformHosts: Set<string> | null = null;

/** For tests only — resets cached platform apex set. */
export function resetTenantHostResolutionCacheForTests() {
  cachedPlatformHosts = null;
}

async function getPlatformMarketingHostnames(supabase: SupabaseClient): Promise<Set<string>> {
  if (cachedPlatformHosts) return cachedPlatformHosts;
  const fromEnv = envPlatformBaseDomains();
  if (fromEnv.length > 0) {
    cachedPlatformHosts = new Set(fromEnv);
    return cachedPlatformHosts;
  }
  const { data } = await supabase
    .from("saas_platform_settings")
    .select("setting_value")
    .eq("setting_key", "platform_base_domain")
    .maybeSingle();
  const set = new Set<string>();
  const v = (data as { setting_value?: string } | null)?.setting_value?.trim().toLowerCase();
  if (v) set.add(v);
  cachedPlatformHosts = set;
  return cachedPlatformHosts;
}

export function isLocalOrPreviewHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.includes("lovable.app") ||
    h.includes("lovableproject.com") ||
    h.includes("vercel.app")
  );
}

/**
 * Sync helper for `/login` post-login redirect (no DB).
 * True on marketing hosts: localhost/preview, 2-label apex (e.g. travelvoo.in), or
 * NEXT_PUBLIC_PLATFORM_BASE_DOMAIN / www.<that> — same idea as tenant resolution.
 */
export function isTenantLoginMarketingRedirectHost(hostname: string): boolean {
  if (isLocalOrPreviewHostname(hostname)) return true;
  const h = hostname.toLowerCase();
  const parts = h.split(".");
  if (parts.length <= 2) return true;
  // www.<apex> is the marketing host even when NEXT_PUBLIC_PLATFORM_BASE_DOMAIN was not baked into the client bundle.
  if (parts.length >= 3 && parts[0] === "www") return true;
  for (const base of envPlatformBaseDomains()) {
    if (h === base || h === `www.${base}`) return true;
  }
  return false;
}

/** True when host is the marketing / SaaS landing apex (e.g. travelvoo.in, www.travelvoo.in). */
export function isMarketingHostname(hostname: string, platformHosts: Set<string>): boolean {
  const h = hostname.toLowerCase();
  if (platformHosts.has(h)) return true;
  if (h.startsWith("www.")) {
    const rest = h.slice(4);
    if (platformHosts.has(rest)) return true;
  }
  return false;
}

/**
 * Resolves tenant from hostname (single source of truth for TenantContext + admin hostname helpers).
 *
 * Order:
 * 1. Local / preview → no tenant
 * 2. Platform marketing apex (env or saas_platform_settings.platform_base_domain) → no tenant
 * 3. Custom domain on tenant_domains (verified)
 * 4. Subdomain only when hostname has 3+ segments (e.g. demo.travelvoo.in → demo)
 */
export async function resolveTenantFromHostnameDb(
  supabase: SupabaseClient,
  hostname: string
): Promise<ResolvedTenantFromHost> {
  if (isLocalOrPreviewHostname(hostname)) {
    return { tenant: null, isSubdomain: false };
  }

  const platformHosts = await getPlatformMarketingHostnames(supabase);
  if (isMarketingHostname(hostname, platformHosts)) {
    return { tenant: null, isSubdomain: false };
  }

  const { data: domainMatch } = await supabase
    .from("tenant_domains")
    .select("tenant_id, tenants(id, tenant_name)")
    .eq("custom_domain", hostname)
    .eq("verified", true)
    .limit(1)
    .maybeSingle();

  if (domainMatch?.tenant_id) {
    const tenant = domainMatch.tenants as { id: string; tenant_name: string } | null;
    return { tenant: { id: domainMatch.tenant_id, name: tenant?.tenant_name ?? "" }, isSubdomain: false };
  }

  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();

    if (subdomain === "www") {
      return { tenant: null, isSubdomain: false };
    }

    const { data: subMatch } = await supabase
      .from("tenant_domains")
      .select("tenant_id, tenants(id, tenant_name)")
      .eq("subdomain", subdomain)
      .limit(1)
      .maybeSingle();

    if (subMatch?.tenant_id) {
      const tenant = subMatch.tenants as { id: string; tenant_name: string } | null;
      return { tenant: { id: subMatch.tenant_id, name: tenant?.tenant_name ?? "" }, isSubdomain: true };
    }

    return { tenant: null, isSubdomain: true };
  }

  return { tenant: null, isSubdomain: false };
}
