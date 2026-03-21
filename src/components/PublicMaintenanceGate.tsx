"use client";

import MaintenancePage from "@/components/MaintenancePage";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { LandingThemeProvider } from "@/components/LandingThemeProvider";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const PageLoader = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }} />
);

/** Public routes only — admin / saas-admin are outside this layout. */
export function PublicMaintenanceGate({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSiteSettings();
  if (loading) return <PageLoader />;
  if (settings?.maintenance_mode) return <MaintenancePage />;
  return (
    <LandingThemeProvider landingThemeSlug={settings?.landing_theme_slug} themeTokens={settings?.theme_tokens ?? undefined}>
      {children}
      <FloatingWhatsApp />
    </LandingThemeProvider>
  );
}
