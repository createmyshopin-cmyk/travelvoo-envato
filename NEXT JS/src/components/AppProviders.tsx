"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WishlistProvider } from "@/context/WishlistContext";
import { TenantProvider } from "@/context/TenantContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { TenantGuard } from "@/components/TenantGuard";
import AnalyticsScripts from "@/components/AnalyticsScripts";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TooltipProvider>
          <TenantProvider>
            <BrandingProvider>
              <WishlistProvider>
                <Toaster />
                <Sonner />
                <AnalyticsScripts />
                <TenantGuard>{children}</TenantGuard>
              </WishlistProvider>
            </BrandingProvider>
          </TenantProvider>
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
