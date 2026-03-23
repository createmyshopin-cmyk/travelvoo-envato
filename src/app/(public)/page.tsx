"use client";

import Index from "@/spa-pages/Index";
import PlatformLanding from "@/spa-pages/PlatformLanding";
import NotFound from "@/spa-pages/NotFound";
import { useTenant } from "@/context/TenantContext";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { tenantId, loading, notFound } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  if (!tenantId) {
    return <PlatformLanding />;
  }

  return <Index />;
}
