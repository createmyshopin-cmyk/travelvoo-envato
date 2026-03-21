import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { ClerkAuthBar } from "@/components/ClerkAuthBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://aoyznmofhgibmuhstrio.supabase.co"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://aoyznmofhgibmuhstrio.supabase.co" />
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
