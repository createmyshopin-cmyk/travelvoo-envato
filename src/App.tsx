import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { WishlistProvider } from "./context/WishlistContext";
import { TenantProvider } from "./context/TenantContext";
import { BrandingProvider } from "./context/BrandingContext";
import MaintenancePage from "./components/MaintenancePage";
import { useSiteSettings } from "./hooks/useSiteSettings";
import AnalyticsScripts from "./components/AnalyticsScripts";

// ─── Public pages ────────────────────────────────────────────────────────────
// Index is the landing page — kept eager so first paint has no waterfall
import Index from "./pages/Index";
const StayDetails   = lazy(() => import("./pages/StayDetails"));
const CategoryPage  = lazy(() => import("./pages/CategoryPage"));
const Wishlist      = lazy(() => import("./pages/Wishlist"));
const NotFound      = lazy(() => import("./pages/NotFound"));
// ─── Admin pages (heavy — only loaded when the user navigates to /admin) ─────
const AdminLogin           = lazy(() => import("./pages/admin/AdminLogin"));
const AdminCreate          = lazy(() => import("./pages/admin/AdminCreate"));
const AdminDashboard       = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminStays           = lazy(() => import("./pages/admin/AdminStays"));
const AdminBookings        = lazy(() => import("./pages/admin/AdminBookings"));
const AdminGuestContacts   = lazy(() => import("./pages/admin/AdminGuestContacts"));
const AdminCoupons         = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminRoomCategories  = lazy(() => import("./pages/admin/AdminRoomCategories"));
const AdminAISettings      = lazy(() => import("./pages/admin/AdminAISettings"));
const AdminMediaGallery    = lazy(() => import("./pages/admin/AdminMediaGallery"));
const AdminReviews         = lazy(() => import("./pages/admin/AdminReviews"));
const AdminSettings        = lazy(() => import("./pages/admin/AdminSettings"));
const AdminQuotations      = lazy(() => import("./pages/admin/AdminQuotations"));
const AdminInvoices        = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminBilling         = lazy(() => import("./pages/admin/AdminBilling"));
const AdminCalendar        = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminAccountProfile  = lazy(() => import("./pages/admin/AdminAccountProfile"));
const AdminAccountDomain   = lazy(() => import("./pages/admin/AdminAccountDomain"));
const AdminAccountBilling  = lazy(() => import("./pages/admin/AdminAccountBilling"));
const AdminAccountUsage    = lazy(() => import("./pages/admin/AdminAccountUsage"));
const AdminReelsStories    = lazy(() => import("./pages/admin/AdminReelsStories"));
const AdminBanner          = lazy(() => import("./pages/admin/AdminBanner"));
const AdminSeo             = lazy(() => import("./pages/admin/AdminSeo"));
const AdminAnalytics       = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAccounting      = lazy(() => import("./pages/admin/AdminAccounting"));
const AdminLayout          = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));

// ─── SaaS-admin pages ─────────────────────────────────────────────────────────
const SaasAdminLogin          = lazy(() => import("./pages/saas-admin/SaasAdminLogin"));
const SaasAdminDashboard      = lazy(() => import("./pages/saas-admin/SaasAdminDashboard"));
const SaasAdminTenants        = lazy(() => import("./pages/saas-admin/SaasAdminTenants"));
const SaasAdminPlans          = lazy(() => import("./pages/saas-admin/SaasAdminPlans"));
const SaasAdminSubscriptions  = lazy(() => import("./pages/saas-admin/SaasAdminSubscriptions"));
const SaasAdminTransactions   = lazy(() => import("./pages/saas-admin/SaasAdminTransactions"));
const SaasAdminFeatures       = lazy(() => import("./pages/saas-admin/SaasAdminFeatures"));
const SaasAdminDomains        = lazy(() => import("./pages/saas-admin/SaasAdminDomains"));
const SaasAdminAnalytics      = lazy(() => import("./pages/saas-admin/SaasAdminAnalytics"));
const SaasAdminAIUsage        = lazy(() => import("./pages/saas-admin/SaasAdminAIUsage"));
const SaasAdminAnnouncements  = lazy(() => import("./pages/saas-admin/SaasAdminAnnouncements"));
const SaasAdminSettings       = lazy(() => import("./pages/saas-admin/SaasAdminSettings"));
const SaasAdminLayout         = lazy(() => import("./components/saas-admin/SaasAdminLayout").then(m => ({ default: m.SaasAdminLayout })));

// ─── React Query client with caching tuned for Vercel Edge ───────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes — avoids redundant Supabase round-trips
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Only retry once on failure (avoids hammering Supabase on real errors)
      retry: 1,
      // Don't refetch just because the user switched browser tabs
      refetchOnWindowFocus: false,
    },
  },
});

// Minimal fallback — invisible, no layout shift
const PageLoader = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }} />
);

/**
 * Wraps public-facing routes with a maintenance mode gate.
 * Admin and SaaS-admin routes are NEVER blocked so operators
 * can always log in and turn off maintenance mode.
 */
const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { settings, loading } = useSiteSettings();
  if (loading) return <PageLoader />;
  if (settings?.maintenance_mode) return <MaintenancePage />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TenantProvider>
      <BrandingProvider>
      <WishlistProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnalyticsScripts />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MaintenanceGate><Index /></MaintenanceGate>} />
              <Route path="/stay/:id" element={<MaintenanceGate><StayDetails /></MaintenanceGate>} />
              <Route path="/category/:slug" element={<MaintenanceGate><CategoryPage /></MaintenanceGate>} />
              <Route path="/wishlist" element={<MaintenanceGate><Wishlist /></MaintenanceGate>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/create" element={<AdminCreate />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard"       element={<AdminDashboard />} />
                <Route path="stays"           element={<AdminStays />} />
                <Route path="rooms"           element={<AdminRoomCategories />} />
                <Route path="bookings"        element={<AdminBookings />} />
                <Route path="guest-contacts"   element={<AdminGuestContacts />} />
                <Route path="coupons"         element={<AdminCoupons />} />
                <Route path="calendar"        element={<AdminCalendar />} />
                <Route path="ai-settings"     element={<AdminAISettings />} />
                <Route path="media"           element={<AdminMediaGallery />} />
                <Route path="reviews"         element={<AdminReviews />} />
                <Route path="quotations"      element={<AdminQuotations />} />
                <Route path="invoices"        element={<AdminInvoices />} />
                <Route path="billing"         element={<AdminBilling />} />
                <Route path="settings"        element={<AdminSettings />} />
                <Route path="reels-stories"   element={<AdminReelsStories />} />
                <Route path="analytics"       element={<AdminAnalytics />} />
                <Route path="accounting"      element={<AdminAccounting />} />
                <Route path="banner"          element={<AdminBanner />} />
                <Route path="seo"             element={<AdminSeo />} />
                <Route path="account/profile" element={<AdminAccountProfile />} />
                <Route path="account/domain"  element={<AdminAccountDomain />} />
                <Route path="account/billing" element={<AdminAccountBilling />} />
                <Route path="account/usage"   element={<AdminAccountUsage />} />
              </Route>
              <Route path="/saas-admin/login" element={<SaasAdminLogin />} />
              <Route path="/saas-admin" element={<SaasAdminLayout />}>
                <Route path="dashboard"    element={<SaasAdminDashboard />} />
                <Route path="tenants"      element={<SaasAdminTenants />} />
                <Route path="plans"        element={<SaasAdminPlans />} />
                <Route path="subscriptions" element={<SaasAdminSubscriptions />} />
                <Route path="transactions" element={<SaasAdminTransactions />} />
                <Route path="features"     element={<SaasAdminFeatures />} />
                <Route path="domains"      element={<SaasAdminDomains />} />
                <Route path="analytics"    element={<SaasAdminAnalytics />} />
                <Route path="ai-usage"     element={<SaasAdminAIUsage />} />
                <Route path="announcements" element={<SaasAdminAnnouncements />} />
                <Route path="settings"     element={<SaasAdminSettings />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WishlistProvider>
      </BrandingProvider>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
