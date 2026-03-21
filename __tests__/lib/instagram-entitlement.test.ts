import { describe, it, expect, vi } from "vitest";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";

function mockSupabase(installs: any[], items: any[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "marketplace_items") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ data: items }),
            }),
          }),
        };
      }
      if (table === "tenant_marketplace_installs") {
        return {
          select: () => ({
            eq: (_: string, __: string) => ({
              eq: (_: string, __: string) => ({
                maybeSingle: () => ({ data: installs[0] ?? null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ eq: () => ({ data: [] }) }) }) };
    }),
  } as any;
}

describe("checkInstagramEntitlement", () => {
  it("returns not entitled when plugin not published", async () => {
    const sb = mockSupabase([], []);
    const result = await checkInstagramEntitlement(sb, "tenant_1");
    expect(result.entitled).toBe(false);
    expect(result.reason).toContain("not published");
  });

  it("returns not entitled when not installed", async () => {
    const items = [{ id: "item_1", pricing_model: "recurring", slug: "instagram-dm-leads" }];
    const sb = mockSupabase([], items);
    const result = await checkInstagramEntitlement(sb, "tenant_1");
    expect(result.entitled).toBe(false);
  });

  it("returns entitled for active install", async () => {
    const items = [{ id: "item_1", pricing_model: "one_time", slug: "instagram-dm-leads" }];
    const installs = [{ status: "installed", config: {} }];
    const sb = mockSupabase(installs, items);
    const result = await checkInstagramEntitlement(sb, "tenant_1");
    expect(result.entitled).toBe(true);
  });

  it("returns not entitled when subscription expired", async () => {
    const items = [{ id: "item_1", pricing_model: "recurring", slug: "instagram-dm-leads" }];
    const past = new Date(Date.now() - 86400000).toISOString();
    const installs = [{ status: "installed", config: { marketplace: { paid_until: past } } }];
    const sb = mockSupabase(installs, items);
    const result = await checkInstagramEntitlement(sb, "tenant_1");
    expect(result.entitled).toBe(false);
    expect(result.reason).toContain("expired");
  });
});
