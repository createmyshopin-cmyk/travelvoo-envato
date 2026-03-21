import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { ClerkAuthBar } from "@/components/ClerkAuthBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SupabaseEnvScript } from "@/components/SupabaseEnvScript";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StayFinder",
  description: "Find and book stays",
};

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      </head>
      <body className="font-sans antialiased">
        <ClerkProvider>
          <ErrorBoundary>
            <AppProviders>
              <ClerkAuthBar />
              {children}
            </AppProviders>
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
