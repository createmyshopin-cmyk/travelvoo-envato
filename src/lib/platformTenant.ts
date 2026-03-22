import { supabase } from "@/integrations/supabase/client";

let cached: string | null | undefined;
let inflight: Promise<string | null> | null = null;

/**
 * UUID of the marketing-site tenant (replaces tenant_id IS NULL).
 * Cached per page load; cleared on auth change via clearPlatformTenantIdCache from callers if needed.
 */
export async function getPlatformTenantId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  if (!inflight) {
    inflight = supabase.rpc("get_platform_tenant_id").then(({ data, error }) => {
      inflight = null;
      if (error || data == null) {
        cached = null;
        return null;
      }
      cached = data as string;
      return cached;
    });
  }
  return inflight;
}

export function clearPlatformTenantIdCache() {
  cached = undefined;
}
