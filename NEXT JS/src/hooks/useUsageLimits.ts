import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UsageLimits {
  loading: boolean;
  canCreateStay: boolean;
  canCreateRoom: boolean;
  canCreateBooking: boolean;
  canUseAISearch: boolean;
  usage: {
    stays_created: number;
    rooms_created: number;
    bookings_this_month: number;
    ai_search_count: number;
  } | null;
  limits: {
    max_stays: number;
    max_rooms: number;
    max_bookings_per_month: number;
    max_ai_search: number;
  } | null;
  checkLimit: (resource: "stay" | "room" | "booking" | "ai_search") => boolean;
  incrementUsage: (resource: "stay" | "room" | "booking" | "ai_search") => Promise<void>;
  refresh: () => Promise<void>;
}

function isWithinLimit(used: number, max: number): boolean {
  if (max === -1) return true; // unlimited
  return used < max;
}

export function useUsageLimits(): UsageLimits {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageLimits["usage"]>(null);
  const [limits, setLimits] = useState<UsageLimits["limits"]>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const { data: myTenantId } = await supabase.rpc("get_my_tenant_id");
    if (!myTenantId) { setLoading(false); return; }
    const { data: tenant } = await supabase.from("tenants").select("id, plan_id").eq("id", myTenantId).single();
    if (!tenant) { setLoading(false); return; }
    setTenantId(tenant.id);

    const [{ data: u }, { data: plan }] = await Promise.all([
      supabase.from("tenant_usage").select("*").eq("tenant_id", tenant.id).single(),
      tenant.plan_id
        ? supabase.from("plans").select("max_stays, max_rooms, max_bookings_per_month, max_ai_search").eq("id", tenant.plan_id).single()
        : Promise.resolve({ data: null }),
    ]);

    setUsage(u ? {
      stays_created: u.stays_created,
      rooms_created: u.rooms_created,
      bookings_this_month: u.bookings_this_month,
      ai_search_count: u.ai_search_count,
    } : null);

    setLimits(plan ? {
      max_stays: plan.max_stays,
      max_rooms: plan.max_rooms,
      max_bookings_per_month: plan.max_bookings_per_month,
      max_ai_search: plan.max_ai_search,
    } : null);

    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const checkLimit = useCallback((resource: "stay" | "room" | "booking" | "ai_search"): boolean => {
    if (!usage || !limits) return true;
    const map = {
      stay: [usage.stays_created, limits.max_stays],
      room: [usage.rooms_created, limits.max_rooms],
      booking: [usage.bookings_this_month, limits.max_bookings_per_month],
      ai_search: [usage.ai_search_count, limits.max_ai_search],
    };
    const [used, max] = map[resource];
    const allowed = isWithinLimit(used, max);
    if (!allowed) {
      toast({
        title: "Plan limit reached",
        description: `You've reached your plan limit for ${resource.replace("_", " ")}s. Upgrade your plan to add more.`,
        variant: "destructive",
      });
    }
    return allowed;
  }, [usage, limits]);

  const incrementUsage = useCallback(async (resource: "stay" | "room" | "booking" | "ai_search") => {
    if (!tenantId || !usage) return;
    const fieldMap = {
      stay: "stays_created",
      room: "rooms_created",
      booking: "bookings_this_month",
      ai_search: "ai_search_count",
    } as const;
    const field = fieldMap[resource];
    await supabase
      .from("tenant_usage")
      .update({ [field]: (usage as any)[field] + 1 })
      .eq("tenant_id", tenantId);
    await fetch();
  }, [tenantId, usage, fetch]);

  return {
    loading,
    canCreateStay: !usage || !limits ? true : isWithinLimit(usage.stays_created, limits.max_stays),
    canCreateRoom: !usage || !limits ? true : isWithinLimit(usage.rooms_created, limits.max_rooms),
    canCreateBooking: !usage || !limits ? true : isWithinLimit(usage.bookings_this_month, limits.max_bookings_per_month),
    canUseAISearch: !usage || !limits ? true : isWithinLimit(usage.ai_search_count, limits.max_ai_search),
    usage,
    limits,
    checkLimit,
    incrementUsage,
    refresh: fetch,
  };
}
