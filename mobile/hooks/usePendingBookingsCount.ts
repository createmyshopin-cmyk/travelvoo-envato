import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

export function usePendingBookingsCount(): number {
  const { tenantId } = useTenant();
  const [count, setCount] = useState(0);

  const fetch = async () => {
    if (!tenantId) return;
    const { count: c } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending");
    setCount(c ?? 0);
  };

  useEffect(() => {
    fetch();
    if (!tenantId) return;

    const channel = supabase
      .channel(`pending-count-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `tenant_id=eq.${tenantId}` }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  return count;
}
