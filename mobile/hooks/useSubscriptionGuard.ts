import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SubscriptionStatus {
  loading: boolean;
  status: string;
  isExpired: boolean;
  isTrial: boolean;
  isActive: boolean;
  isSuspended: boolean;
  daysRemaining: number | null;
  plan: any;
  usage: any;
  subscription: any;
  canAccessFeatures: boolean;
}

export function useSubscriptionGuard(): SubscriptionStatus {
  const [state, setState] = useState<SubscriptionStatus>({
    loading: true,
    status: "trial",
    isExpired: false,
    isTrial: true,
    isActive: false,
    isSuspended: false,
    daysRemaining: null,
    plan: null,
    usage: null,
    subscription: null,
    canAccessFeatures: true,
  });
  const [tenantId, setTenantId] = useState<string | null>(null);

  const check = async () => {
    const { data: tenant } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
    if (!tenant) { setState((s) => ({ ...s, loading: false })); return; }

    setTenantId(tenant.id);

    // Refresh usage counts from source tables before reading
    try { await supabase.rpc("refresh_tenant_usage", { p_tenant_id: tenant.id }); } catch (_) {}

    const [subRes, usageRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tenant_usage")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle(),
    ]);

    const sub = subRes.data;
    const usage = usageRes.data;

    const { data: plan } = tenant.plan_id
      ? await supabase.from("plans").select("*").eq("id", tenant.plan_id).maybeSingle()
      : { data: null };

    let daysRemaining: number | null = null;
    if (sub?.renewal_date) {
      daysRemaining = Math.ceil((new Date(sub.renewal_date).getTime() - Date.now()) / 86400000);
    }

    const status = sub?.status || tenant.status || "trial";
    const isTrialExpired = status === "trial" && daysRemaining !== null && daysRemaining <= 0;
    const effectiveStatus = isTrialExpired ? "expired" : status;

    const isExpired = effectiveStatus === "expired" || effectiveStatus === "cancelled";
    const isSuspended = effectiveStatus === "suspended";

    setState({
      loading: false,
      status: effectiveStatus,
      isExpired,
      isTrial: effectiveStatus === "trial",
      isActive: effectiveStatus === "active",
      isSuspended,
      daysRemaining,
      plan,
      usage,
      subscription: sub,
      canAccessFeatures: !isExpired && !isSuspended,
    });
  };

  useEffect(() => { check(); }, []);

  // Realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const tenantChannel = supabase
      .channel(`mob-guard-tenant-${tenantId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tenants", filter: `id=eq.${tenantId}` }, () => check())
      .subscribe();

    const subChannel = supabase
      .channel(`mob-guard-sub-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `tenant_id=eq.${tenantId}` }, () => check())
      .subscribe();

    return () => {
      supabase.removeChannel(tenantChannel);
      supabase.removeChannel(subChannel);
    };
  }, [tenantId]);

  return state;
}
