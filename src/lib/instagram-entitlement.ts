import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify the tenant has an active `instagram_dm_leads` plugin install.
 * For recurring plans, `config.marketplace.paid_until` must be in the future.
 * Accepts either a service-role or user-scoped client.
 */
export async function checkInstagramEntitlement(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ entitled: boolean; reason?: string }> {
  const { data: items } = await supabase
    .from("marketplace_items")
    .select("id, pricing_model")
    .eq("type", "plugin")
    .eq("is_published", true);

  const igItem = (items ?? []).find((i: any) => {
    const m = i.manifest ?? (typeof i.manifest === "string" ? JSON.parse(i.manifest) : null);
    // Fallback: check all items for matching plugin_key in manifest
    return m?.plugin_key === "instagram_dm_leads";
  });

  // Also search by slug convention
  const igItemFallback = igItem ?? (items ?? []).find((i: any) => (i as any).slug === "instagram-dm-leads");
  if (!igItemFallback) return { entitled: false, reason: "Plugin not published in marketplace" };

  const { data: install } = await supabase
    .from("tenant_marketplace_installs")
    .select("status, config")
    .eq("tenant_id", tenantId)
    .eq("item_id", (igItemFallback as any).id)
    .maybeSingle();

  if (!install || install.status !== "installed") {
    return { entitled: false, reason: "Plugin not installed" };
  }

  const paidUntil = (install.config as any)?.marketplace?.paid_until;
  if (paidUntil && new Date(paidUntil) < new Date()) {
    return { entitled: false, reason: "Subscription expired" };
  }

  return { entitled: true };
}
