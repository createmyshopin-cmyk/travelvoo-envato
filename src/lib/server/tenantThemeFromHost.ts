import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { hexToHsl } from "@/lib/hexToHsl";
import {
  resolveTenantFromHostnameDb,
  isLocalOrPreviewHostname,
} from "@/lib/resolveTenantFromHost";

const PLATFORM_MARKETING_HOSTS = new Set([
  "travelvoo.in",
  "www.travelvoo.in",
]);

function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase();
  return PLATFORM_MARKETING_HOSTS.has(h) || isLocalOrPreviewHostname(h);
}

/**
 * Fetches the primary/secondary hex colors for the tenant associated with
 * the given hostname, converts them to HSL, and returns an inline :root CSS
 * block that overrides the default globals.css values before first paint.
 *
 * Returns null for marketing/platform hosts (globals defaults are correct).
 *
 * This runs server-side only and is cached per hostname for 120 seconds.
 */
async function _getTenantThemeCss(host: string): Promise<string | null> {
  if (!host || isPlatformHost(host)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  let tenantId: string | null = null;
  try {
    const resolved = await resolveTenantFromHostnameDb(supabase, host);
    tenantId = resolved.tenant?.id ?? null;
  } catch {
    return null;
  }

  if (!tenantId) return null;

  const { data } = await supabase
    .from("tenants")
    .select("primary_color, secondary_color")
    .eq("id", tenantId)
    .maybeSingle();

  if (!data) return null;

  const primaryHsl = hexToHsl(data.primary_color ?? "");
  const secondaryHsl = hexToHsl(data.secondary_color ?? "");

  if (!primaryHsl && !secondaryHsl) return null;

  const vars: string[] = [];

  if (primaryHsl) {
    vars.push(`--primary:${primaryHsl};`);
    vars.push(`--primary-foreground:0 0% 100%;`);
    vars.push(`--ring:${primaryHsl};`);
    vars.push(`--sidebar-primary:${primaryHsl};`);
    vars.push(`--story-gradient-start:${primaryHsl};`);
  }

  if (secondaryHsl) {
    vars.push(`--accent:${secondaryHsl};`);
  }

  return `:root{${vars.join("")}}`;
}

export const getCachedTenantThemeCss = unstable_cache(
  _getTenantThemeCss,
  ["tenant-theme-css"],
  { revalidate: 120 }
);
