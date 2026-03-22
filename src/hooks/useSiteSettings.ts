import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveTenantFromHostname } from "@/hooks/useAdminAuth";
import { isLocalOrPreviewHostname } from "@/lib/resolveTenantFromHost";
import { clearPlatformTenantIdCache, getPlatformTenantId } from "@/lib/platformTenant";

interface SiteSettings {
  id: string;
  tenant_id: string | null;
  /** Declarative landing theme preset (allowlisted in app). */
  landing_theme_slug?: string | null;
  /** Allowlisted CSS variables as JSON object. */
  theme_tokens?: import("@/integrations/supabase/types").Json | null;
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
  currency: string;
  booking_enabled: boolean;
  maintenance_mode: boolean;
  sticky_menu_enabled: boolean;
  sticky_menu_show_ai: boolean;
  sticky_menu_show_wishlist: boolean;
  sticky_menu_show_explore: boolean;
  sticky_menu_show_reels: boolean;
  auto_generate_invoice: boolean;
  ga_id: string;
  fb_pixel_id: string;
  clarity_id: string;
}

interface UseSiteSettingsReturn {
  settings: SiteSettings | null;
  loading: boolean;
}

let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings | null> | null = null;

/** Call this after admin saves settings to ensure next read hits the DB fresh. */
export function clearSiteSettingsCache() {
  cachedSettings = null;
  fetchPromise = null;
}

// Automatically clear cache on any auth state change (login / logout / signup).
// Prevents a previous admin's settings leaking into a newly logged-in session.
// Must not run at module load on the server: touching `supabase` triggers client creation
// and fails `next build` prerender when NEXT_PUBLIC_* env vars are missing (e.g. CI).
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    cachedSettings = null;
    fetchPromise = null;
    clearPlatformTenantIdCache();
  });
}

/**
 * Loads exactly one site_settings row for the current host:
 * - Tenant subdomain/custom domain → `tenant_id` = resolved tenant (never another tenant).
 * - Marketing / platform apex → `tenant_id` = platform tenant (get_platform_tenant_id), not NULL.
 * - Localhost / preview hosts → optional: logged-in user's tenant for dev, else platform row.
 */
export async function fetchSiteSettingsForCurrentHost(): Promise<SiteSettings | null> {
  const tenantId = await resolveTenantFromHostname();
  let query = supabase.from("site_settings").select("*");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    if (isLocalOrPreviewHostname(host)) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (tenant?.id) {
          query = query.eq("tenant_id", tenant.id);
        } else {
          const pid = await getPlatformTenantId();
          query = pid ? query.eq("tenant_id", pid) : query.is("tenant_id", null);
        }
      } else {
        const pid = await getPlatformTenantId();
        query = pid ? query.eq("tenant_id", pid) : query.is("tenant_id", null);
      }
    } else {
      const pid = await getPlatformTenantId();
      query = pid ? query.eq("tenant_id", pid) : query.is("tenant_id", null);
    }
  }

  const { data } = await query.limit(1).maybeSingle();
  return data as SiteSettings | null;
}

/**
 * Fetches site_settings for the current tenant (resolved from hostname).
 * Module-level cache: one fetch per full page load; call `clearSiteSettingsCache` after admin saves.
 */
export function useSiteSettings(): UseSiteSettingsReturn {
  const [settings, setSettings] = useState<SiteSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchSiteSettingsForCurrentHost().then((data) => {
        cachedSettings = data;
        fetchPromise = null;
        return cachedSettings;
      });
    }

    fetchPromise.then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
}
