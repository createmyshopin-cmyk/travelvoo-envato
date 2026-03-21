import PublicMaintenanceShell from "./PublicMaintenanceShell";

/** Public routes use maintenance gate; still allow SSR without crashing on browser-only APIs. */
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicMaintenanceShell>{children}</PublicMaintenanceShell>;
}
