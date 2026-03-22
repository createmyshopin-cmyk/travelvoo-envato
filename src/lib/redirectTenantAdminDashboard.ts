import type { SupabaseClient } from "@supabase/supabase-js";
import { isTenantLoginMarketingRedirectHost } from "@/lib/resolveTenantFromHost";

export type RedirectTenantAdminOptions = {
  /** Subdomain slug from signup form / OAuth pending (avoids RLS gaps on tenants/tenant_domains right after signup). */
  knownSubdomain?: string;
};

function normalizeSubdomain(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
}

/** Full URL to tenant admin on this protocol (http dev / https prod). */
function tenantAdminAbsoluteUrl(slug: string, apexDomain: string): string {
  const proto = typeof window !== "undefined" && window.location.protocol === "http:" ? "http:" : "https:";
  return `${proto}//${slug}.${apexDomain}/admin/dashboard`;
}

function navigateHard(url: string): void {
  // Defer past React commit + toast updates so the browser reliably performs cross-subdomain navigation.
  queueMicrotask(() => {
    window.location.replace(url);
  });
}

/** Apex for tenant subdomains (no leading dot, no www). */
export function platformBaseDomainFromEnv(): string {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN?.trim().toLowerCase() ?? "" : "";
  let s = raw.replace(/^\./, "");
  if (s.startsWith("www.")) s = s.slice(4);
  return s || "travelvoo.in";
}

/**
 * On marketing apex / www (no tenant in hostname), send the tenant admin to their subdomain dashboard.
 * On tenant hosts or when subdomain is unknown, stay on current origin with `/admin/dashboard`.
 *
 * Prefers `knownSubdomain` when provided (create-account flow). Otherwise uses `get_my_tenant_id()` RPC
 * (works with typical SECURITY DEFINER + RLS), then falls back to tenants by user_id.
 */
export async function redirectTenantAdminDashboard(
  supabase: SupabaseClient,
  userId: string,
  router: { replace: (href: string) => void },
  options?: RedirectTenantAdminOptions
): Promise<void> {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (!isTenantLoginMarketingRedirectHost(hostname)) {
    router.replace("/admin/dashboard");
    return;
  }

  const slugImmediate = normalizeSubdomain(options?.knownSubdomain ?? "");
  if (slugImmediate.length >= 2 && typeof window !== "undefined") {
    const base = platformBaseDomainFromEnv();
    navigateHard(tenantAdminAbsoluteUrl(slugImmediate, base));
    return;
  }

  const { data: suffixRow } = await supabase
    .from("saas_platform_settings")
    .select("setting_value")
    .eq("setting_key", "platform_subdomain_suffix")
    .maybeSingle();
  const suffix = suffixRow?.setting_value || ".travelvoo.in";
  const baseDomain = suffix.replace(/^\./, "");
  if (!baseDomain) {
    router.replace("/admin/dashboard");
    return;
  }

  let slug = normalizeSubdomain(options?.knownSubdomain ?? "");

  if (!slug || slug.length < 2) {
    const { data: tenantIdRpc } = await supabase.rpc("get_my_tenant_id");
    const tid = typeof tenantIdRpc === "string" ? tenantIdRpc : null;
    if (tid) {
      const { data: domain } = await supabase
        .from("tenant_domains")
        .select("subdomain")
        .eq("tenant_id", tid)
        .not("subdomain", "is", null)
        .limit(1)
        .maybeSingle();
      slug = normalizeSubdomain(domain?.subdomain ?? "");
    }
  }

  if (!slug || slug.length < 2) {
    const { data: tenant } = await supabase.from("tenants").select("id").eq("user_id", userId).maybeSingle();
    if (tenant?.id) {
      const { data: domain } = await supabase
        .from("tenant_domains")
        .select("subdomain")
        .eq("tenant_id", tenant.id)
        .not("subdomain", "is", null)
        .limit(1)
        .maybeSingle();
      slug = normalizeSubdomain(domain?.subdomain ?? "");
    }
  }

  if (slug && baseDomain) {
    navigateHard(tenantAdminAbsoluteUrl(slug, baseDomain));
    return;
  }

  router.replace("/admin/dashboard");
}
