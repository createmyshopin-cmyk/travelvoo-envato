"use client";

import { useTenant } from "@/context/TenantContext";

const PageLoader = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }} />
);

/**
 * Subdomain / tenant resolution — wraps the whole app (including admin), matching the Vite SPA.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { notFound, loading } = useTenant();
  if (loading) return <PageLoader />;
  if (notFound) {
    const subdomain =
      typeof window !== "undefined" ? window.location.hostname.split(".")[0] : "";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Subdomain Not Found</h1>
        <p className="text-muted-foreground mb-1 max-w-sm">
          <span className="font-mono font-medium text-foreground">{subdomain}</span> is not
          registered as a property on this platform.
        </p>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm">
          If you&apos;re trying to set up a new property, create an account first.
        </p>
        <a
          href={`${typeof window !== "undefined" ? window.location.protocol : "https:"}//${typeof window !== "undefined" ? window.location.hostname.split(".").slice(1).join(".") : ""}/create-account`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Create an Account
        </a>
      </div>
    );
  }
  return <>{children}</>;
}
