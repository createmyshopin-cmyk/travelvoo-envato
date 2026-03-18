import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveTenantFromHostname } from "@/hooks/useAdminAuth";

interface SiteSettings {
  id: string;
  tenant_id: string | null;
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

/**
 * Fetches site_settings for the current tenant (resolved from subdomain).
 * Falls back to the first row when running on localhost / root domain.
 * Module-level cache so the DB is hit only once per page load.
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
      fetchPromise = resolveTenantFromHostname().then(async (tenantId) => {
        let query = supabase.from("site_settings").select("*");

        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        }

        const { data } = await query.limit(1).maybeSingle();
        cachedSettings = data as SiteSettings | null;
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
