"use client";

import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SaasAdminSidebar } from "./SaasAdminSidebar";
import { useSaasAdminAuth } from "@/hooks/useSaasAdminAuth";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export function SaasAdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isSuperAdmin, signOut } = useSaasAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace("/saas-admin/login");
    }
  }, [loading, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <SaasAdminSidebar onSignOut={signOut} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <Shield className="w-5 h-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold text-foreground">SaaS Platform Admin</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
