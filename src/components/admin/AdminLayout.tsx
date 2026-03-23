"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { NewBookingPopup } from "./NewBookingPopup";
import { useBookingNotification } from "@/hooks/useBookingNotification";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { usePlatformMaintenanceMode } from "@/hooks/usePlatformMaintenanceMode";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle, ShieldOff, ArrowUpCircle, Lock, WrenchIcon } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";

const FEATURE_ROUTES: Record<string, { key: string; label: string }> = {
  "/admin/coupons": { key: "coupons", label: "Coupons" },
  "/admin/ai-settings": { key: "ai_search", label: "AI Search" },
  "/admin/quotations": { key: "quotation_generator", label: "Quotation Generator" },
  "/admin/invoices": { key: "invoice_generator", label: "Invoice Generator" },
  "/admin/reels-stories": { key: "reels", label: "Reels & Stories" },
  "/admin/analytics": { key: "analytics", label: "Analytics" },
  "/admin/account/domain": { key: "custom_domain", label: "Custom Domain" },
  "/admin/calendar": { key: "dynamic_pricing", label: "Dynamic Pricing" },
  "/admin/marketplace": { key: "marketplace", label: "Marketplace" },
};

function BookingNotificationListener() {
  const { newBooking, clearNewBooking } = useBookingNotification();
  return (
    <>
      <NewBookingPopup booking={newBooking} onClose={clearNewBooking} />
    </>
  );
}

function PlatformMaintenanceOverlay() {
  const { isEnabled, loading } = usePlatformMaintenanceMode();
  if (loading || !isEnabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="platform-maintenance"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", background: "rgba(0,0,0,0.5)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.08 }}
          className="bg-background w-full max-w-sm rounded-3xl shadow-2xl px-8 py-10 flex flex-col items-center text-center overflow-hidden relative"
          role="alertdialog"
          aria-modal="true"
          aria-label="Platform under maintenance"
        >
          {/* Glow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 blur-3xl bg-primary" />

          {/* Animated icon */}
          <motion.div
            animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
            className="mb-5 p-4 rounded-2xl bg-primary/10"
          >
            <WrenchIcon className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="text-[22px] font-extrabold text-foreground leading-tight">
            We're Under Maintenance
          </h1>

          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            We are currently <strong className="text-foreground">not accepting new bookings.</strong>
            <br />
            Our team is working hard behind the scenes. We'll be back shortly!
          </p>

          {/* Pulsing dots */}
          <div className="flex items-center gap-2 mt-6">
            {[0, 0.2, 0.4].map((delay, i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.4, repeat: Infinity, delay }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SubscriptionLockOverlay() {
  const { isExpired, isSuspended, status, loading } = useSubscriptionGuard();
  const router = useRouter();
  const pathname = usePathname();

  if (loading || pathname.startsWith("/admin/account/billing")) return null;
  if (!isExpired && !isSuspended) return null;

  const isCancelled = status === "cancelled";

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/70">
      <div className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        {isSuspended ? (
          <>
            <div className="flex justify-center">
              <ShieldOff className="w-14 h-14 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Account Suspended</h2>
            <p className="text-sm text-muted-foreground">
              Your account has been suspended by the platform administrator. Please contact support.
            </p>
          </>
        ) : isCancelled ? (
          <>
            <div className="flex justify-center">
              <ArrowUpCircle className="w-14 h-14 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Subscription Cancelled</h2>
            <p className="text-sm text-muted-foreground">
              Your subscription has been cancelled. Re-activate your plan to continue.
            </p>
            <Button className="w-full" onClick={() => router.push("/admin/account/billing")}>
              Upgrade Your Plan
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-14 h-14 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Subscription Expired</h2>
            <p className="text-sm text-muted-foreground">
              Your subscription has expired. Renew your plan to continue using all features.
            </p>
            <Button className="w-full" onClick={() => router.push("/admin/account/billing")}>
              Upgrade Your Plan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureLockOverlay() {
  const { plan, loading, isExpired, isSuspended } = useSubscriptionGuard();
  const router = useRouter();
  const pathname = usePathname();

  if (loading || isExpired || isSuspended) return null;

  const routeFeature = Object.entries(FEATURE_ROUTES).find(([path]) => pathname.startsWith(path));
  if (!routeFeature) return null;

  const [, { key, label }] = routeFeature;
  const featureFlags: Record<string, boolean> = plan?.feature_flags ?? {};
  const isEnabled = !!featureFlags[key];

  if (isEnabled) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/70">
      <div className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Lock className="w-14 h-14 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{label} Not Available</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{label}</span> is not included in your current plan. Upgrade to unlock this
          feature.
        </p>
        <Button className="w-full" onClick={() => router.push("/admin/account/billing")}>
          Upgrade Your Plan
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, signOut } = useAdminAuth();
  const { settings } = useSiteSettings();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <BookingNotificationListener />
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar onSignOut={signOut} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold text-foreground">
              {settings?.site_name || "Stay Admin"}
            </h1>
          </header>
          <main className="relative flex-1 p-4 md:p-6 overflow-auto">
            <PlatformMaintenanceOverlay />
            <SubscriptionLockOverlay />
            <FeatureLockOverlay />
            <SubscriptionBanner />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
