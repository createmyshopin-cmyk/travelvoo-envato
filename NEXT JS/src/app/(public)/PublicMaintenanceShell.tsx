"use client";

import { PublicMaintenanceGate } from "@/components/PublicMaintenanceGate";

export default function PublicMaintenanceShell({ children }: { children: React.ReactNode }) {
  return <PublicMaintenanceGate>{children}</PublicMaintenanceGate>;
}
