import { SaasAdminLayout } from "@/components/saas-admin/SaasAdminLayout";

export default function SaasAdminShellLayout({ children }: { children: React.ReactNode }) {
  return <SaasAdminLayout>{children}</SaasAdminLayout>;
}
