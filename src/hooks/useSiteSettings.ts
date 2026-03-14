import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  id: string;
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
 * Fetches site_settings from Supabase with a module-level cache so the
 * DB is only hit once per page load, even if multiple components call this hook.
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
      fetchPromise = Promise.resolve(
        supabase
          .from("site_settings")
          .select("*")
          .limit(1)
          .single()
      ).then(({ data }) => {
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
