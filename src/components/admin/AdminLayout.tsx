import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { NewBookingPopup } from "./NewBookingPopup";
import { useBookingNotification } from "@/hooks/useBookingNotification";
import { Outlet } from "react-router-dom";

function BookingNotificationListener() {
  const { newBooking, clearNewBooking } = useBookingNotification();
  return (
    <>
      <NewBookingPopup booking={newBooking} onClose={clearNewBooking} />
    </>
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

  if (!isAdmin) return null;

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
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <SubscriptionBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
