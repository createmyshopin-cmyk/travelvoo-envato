import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SupabaseEnvScript } from "@/components/SupabaseEnvScript";
import { getCachedTenantThemeCss } from "@/lib/server/tenantThemeFromHost";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

function isPlatformMarketingHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "travelvoo.in" ||
    h === "www.travelvoo.in" ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

const TRAVELVOO_OG_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBPiVq3LOtlPjzmGDNxfHu9XVpOESftsu8jNoRVKU71XRslnifojB-iB0SuG45St6lrRU1KSoXTIbHBAJnec45uppfd8H5LOj_oQX7uxiRdU-OG5xlOVcs0YdT17tyVAABYRPxuHr0g7SXXywGbIb5V6jG8uvc7HBzh7QLW_5NHvzvrXn0odGFIIIoWsRRmyZTl-2L8cdMN38u-95_cst9MZi65Ay_FcRRxa6FZuI-GxyVXUJet06Ic1s26OBf552t7c5GqPSkORBpA";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (isPlatformMarketingHost(host)) {
    return {
      title: "TravelVoo | The Modern Navigator for Luxury Rentals",
      description:
        "TravelVoo helps resorts, homestays, and property owners launch high-converting direct booking websites in minutes.",
      openGraph: {
        title: "TravelVoo | The Modern Navigator for Luxury Rentals",
        description:
          "Launch your high-converting direct booking website in minutes. Manage reservations, pricing, and guests from one powerful platform.",
        type: "website",
        url: "https://travelvoo.in",
        images: [
          {
            url: TRAVELVOO_OG_IMAGE,
            width: 1200,
            height: 630,
            alt: "TravelVoo Dashboard Preview",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "TravelVoo | Hospitality Automation Platform",
        description: "Launch your high-converting direct booking website in minutes.",
        images: [TRAVELVOO_OG_IMAGE],
      },
    };
  }

  // Tenant / default fallback metadata
  return {
    title: "StayFinder",
    description: "Find and book stays",
    openGraph: {
      title: "StayFinder",
      description: "Find and book premium stays directly.",
      type: "website",
    },
  };
}

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host")?.split(":")[0] ?? "";
  const tenantThemeCss = await getCachedTenantThemeCss(host);

  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        <SupabaseEnvScript />
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        {tenantThemeCss ? (
          <style
            id="tenant-theme-ssr"
            dangerouslySetInnerHTML={{ __html: tenantThemeCss }}
          />
        ) : null}
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <AppProviders>{children}</AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
