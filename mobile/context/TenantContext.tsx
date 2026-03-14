import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface TenantContextValue {
  tenantId: string | null;
  tenantName: string | null;
  tenantStatus: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenantId: null,
  tenantName: null,
  tenantStatus: null,
  loading: true,
  refresh: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setTenantId(null);
      setTenantName(null);
      setTenantStatus(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("tenants")
      .select("id, tenant_name, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setTenantId(data?.id ?? null);
    setTenantName(data?.tenant_name ?? null);
    setTenantStatus(data?.status ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, tenantName, tenantStatus, loading, refresh: load }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
