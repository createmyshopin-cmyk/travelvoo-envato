import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./TenantContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { JsonLd } from "@/components/seo/JsonLd";

interface BrandingSeo {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
}

interface BrandingConfig {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
  loading: boolean;
  seo?: BrandingSeo;
  organizationSchema?: Record<string, unknown>;
}

const defaultBranding: BrandingConfig = {
  siteName: "StayFinder",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "",
  secondaryColor: "",
  footerText: "",
  loading: true,
};

const BrandingContext = createContext<BrandingConfig>(defaultBranding);

export const useBranding = () => useContext(BrandingContext);

/**
 * Converts a hex color to HSL values string (e.g. "220 70% 50%")
 */
function hexToHsl(hex: string): string | null {
  if (!hex || !hex.startsWith("#")) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { tenantId, notFound } = useTenant();
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);

  useDocumentHead(
    branding.seo
      ? {
          title: branding.seo.title || branding.siteName,
          description: branding.seo.description,
          keywords: branding.seo.keywords,
          ogTitle: branding.seo.title || branding.siteName,
          ogDescription: branding.seo.description,
          ogImage: branding.seo.ogImage,
          ogType: "website",
          canonicalUrl: typeof window !== "undefined" ? window.location.origin + (window.location.pathname || "/") : undefined,
        }
      : {}
  );

  useEffect(() => {
    async function loadBranding() {
      // If on an unregistered subdomain, skip branding load entirely
      if (notFound) {
        setBranding({ ...defaultBranding, loading: false });
        return;
      }

      let tenantData: any = null;

      if (tenantId) {
        const { data } = await supabase
          .from("tenants")
          .select("tenant_name, logo_url, favicon_url, primary_color, secondary_color, footer_text, seo_title, seo_description, seo_keywords, og_image_url")
          .eq("id", tenantId)
          .single();
        tenantData = data;
      } else {
        const { data } = await supabase
          .from("tenants")
          .select("tenant_name, logo_url, favicon_url, primary_color, secondary_color, footer_text, seo_title, seo_description, seo_keywords, og_image_url")
          .limit(1)
          .single();
        tenantData = data;
      }

      const { data: siteData } = await supabase
        .from("site_settings")
        .select("meta_title, meta_description, meta_keywords, og_image_url, og_title, og_description, contact_email, contact_phone, social_instagram, social_facebook, social_youtube")
        .limit(1)
        .single();

      const siteSeo = siteData as Record<string, string> | null;
      const siteName = tenantData?.tenant_name || siteSeo?.meta_title || "StayFinder";

      const seo: BrandingSeo = {
        title: tenantData?.seo_title || siteSeo?.meta_title || siteName,
        description: tenantData?.seo_description || siteSeo?.meta_description || "",
        keywords: tenantData?.seo_keywords || siteSeo?.meta_keywords || "",
        ogImage: tenantData?.og_image_url || siteSeo?.og_image_url || tenantData?.logo_url || "",
      };

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const sameAs: string[] = [];
      if (siteSeo?.social_instagram) sameAs.push(siteSeo.social_instagram);
      if (siteSeo?.social_facebook) sameAs.push(siteSeo.social_facebook);
      if (siteSeo?.social_youtube) sameAs.push(siteSeo.social_youtube);

      const organizationSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: origin,
        logo: tenantData?.logo_url || undefined,
        ...(sameAs.length ? { sameAs } : {}),
        ...((siteSeo?.contact_email || siteSeo?.contact_phone) && {
          contactPoint: {
            "@type": "ContactPoint",
            ...(siteSeo.contact_email && { email: siteSeo.contact_email }),
            ...(siteSeo.contact_phone && { telephone: siteSeo.contact_phone }),
          },
        }),
      };

      const websiteSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: origin,
      };

      if (tenantData) {
        const config: BrandingConfig = {
          siteName,
          logoUrl: tenantData.logo_url || "",
          faviconUrl: tenantData.favicon_url || "",
          primaryColor: tenantData.primary_color || "",
          secondaryColor: tenantData.secondary_color || "",
          footerText: tenantData.footer_text || "",
          loading: false,
          seo,
          organizationSchema: [organizationSchema, websiteSchema],
        };
        setBranding(config);

        const root = document.documentElement;
        if (config.primaryColor) {
          const hsl = hexToHsl(config.primaryColor);
          if (hsl) {
            root.style.setProperty("--primary", hsl);
            root.style.setProperty("--sidebar-primary", hsl);
          }
        }
        if (config.secondaryColor) {
          const hsl = hexToHsl(config.secondaryColor);
          if (hsl) root.style.setProperty("--accent", hsl);
        }

        if (config.faviconUrl) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
            || document.createElement("link");
          link.rel = "icon";
          link.href = config.faviconUrl;
          document.head.appendChild(link);
        }
      } else {
        setBranding({
          ...defaultBranding,
          siteName,
          loading: false,
          seo,
          organizationSchema: [organizationSchema, websiteSchema],
        });
      }
    }

    loadBranding();

    return () => {
      const root = document.documentElement;
      root.style.removeProperty("--primary");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--accent");
    };
  }, [tenantId, notFound]);

  return (
    <BrandingContext.Provider value={branding}>
      {branding.organizationSchema && (
        <JsonLd data={branding.organizationSchema} />
      )}
      {children}
    </BrandingContext.Provider>
  );
}
