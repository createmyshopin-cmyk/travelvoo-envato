import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
