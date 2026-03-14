import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { NewBookingPopup } from "./NewBookingPopup";
import { useBookingNotification } from "@/hooks/useBookingNotification";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function BookingNotificationListener() {
  const { newBooking, clearNewBooking } = useBookingNotification();
  return (
    <>
      <NewBookingPopup booking={newBooking} onClose={clearNewBooking} />
    </>
  );
}

function SubscriptionLockOverlay() {
  const { isExpired, isSuspended, loading } = useSubscriptionGuard();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't lock on the billing page itself
  if (loading || location.pathname.startsWith("/admin/account/billing")) return null;
  if (!isExpired && !isSuspended) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60">
      <div className="bg-background border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        {isSuspended ? (
          <>
            <div className="flex justify-center">
              <ShieldOff className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Account Suspended</h2>
            <p className="text-sm text-muted-foreground">Your account has been suspended by the platform administrator. Please contact support.</p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Subscription Expired</h2>
            <p className="text-sm text-muted-foreground">Your subscription has expired. Renew your plan to continue using all features.</p>
            <Button className="w-full" onClick={() => navigate("/admin/account/billing")}>
              Pay Now to Activate
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { loading, isAdmin, signOut } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <SidebarProvider>
      <BookingNotificationListener />
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar onSignOut={signOut} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold text-foreground">Stay Admin</h1>
          </header>
          <main className="relative flex-1 p-4 md:p-6 overflow-auto">
            <SubscriptionLockOverlay />
            <SubscriptionBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
