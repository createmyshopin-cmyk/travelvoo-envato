import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resetTenantHostResolutionCacheForTests,
  resolveTenantFromHostnameDb,
  isLocalOrPreviewHostname,
  isMarketingHostname,
  isTenantLoginMarketingRedirectHost,
} from "@/lib/resolveTenantFromHost";

beforeEach(() => {
  resetTenantHostResolutionCacheForTests();
  delete process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN;
});

describe("isLocalOrPreviewHostname", () => {
  it("matches localhost and Vercel preview hosts", () => {
    expect(isLocalOrPreviewHostname("localhost")).toBe(true);
    expect(isLocalOrPreviewHostname("127.0.0.1")).toBe(true);
    expect(isLocalOrPreviewHostname("app.vercel.app")).toBe(true);
    expect(isLocalOrPreviewHostname("travelvoo.in")).toBe(false);
  });
});

describe("isMarketingHostname", () => {
  it("matches apex and www only", () => {
    const platform = new Set(["travelvoo.in"]);
    expect(isMarketingHostname("travelvoo.in", platform)).toBe(true);
    expect(isMarketingHostname("www.travelvoo.in", platform)).toBe(true);
    expect(isMarketingHostname("demo.travelvoo.in", platform)).toBe(false);
  });
});

describe("isTenantLoginMarketingRedirectHost", () => {
  it("treats 2-label apex as marketing", () => {
    expect(isTenantLoginMarketingRedirectHost("travelvoo.in")).toBe(true);
  });
  it("treats www.<apex> as marketing without env (build-time env optional)", () => {
    expect(isTenantLoginMarketingRedirectHost("www.travelvoo.in")).toBe(true);
  });
  it("treats tenant subdomain as non-marketing", () => {
    expect(isTenantLoginMarketingRedirectHost("demo.travelvoo.in")).toBe(false);
  });
  it("matches www apex when env lists platform base domain", () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    expect(isTenantLoginMarketingRedirectHost("www.travelvoo.in")).toBe(true);
  });
});

describe("resolveTenantFromHostnameDb", () => {
  it("returns null tenant for platform apex (env), without querying tenant_domains", async () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    const from = vi.fn();
    const supabase = { from } as unknown as SupabaseClient;
    const r = await resolveTenantFromHostnameDb(supabase, "travelvoo.in");
    expect(r.tenant).toBeNull();
    expect(r.isSubdomain).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns null tenant for platform apex loaded from saas_platform_settings when env is unset", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "saas_platform_settings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { setting_value: "travelvoo.in" } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;
    const r = await resolveTenantFromHostnameDb(supabase, "travelvoo.in");
    expect(r.tenant).toBeNull();
    expect(r.isSubdomain).toBe(false);
  });

  it("resolves demo tenant on demo.<apex> when apex is marketing", async () => {
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "travelvoo.in";
    const demoTenant = {
      tenant_id: "demo-uuid",
      tenants: { id: "demo-uuid", tenant_name: "Demo Resort" },
    };
    const from = vi.fn((table: string) => {
      if (table !== "tenant_domains") throw new Error("expected only tenant_domains");
      return {
        select: () => ({
          eq: (col: string) => {
            if (col === "custom_domain") {
              return {
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              };
            }
            if (col === "subdomain") {
              return {
                limit: () => ({
                  maybeSingle: async () => ({ data: demoTenant }),
                }),
              };
            }
            throw new Error(`unexpected eq ${col}`);
          },
        }),
      };
    });
    const r = await resolveTenantFromHostnameDb({ from } as unknown as SupabaseClient, "demo.travelvoo.in");
    expect(r.tenant?.id).toBe("demo-uuid");
    expect(r.isSubdomain).toBe(true);
  });

  it("does not query subdomain for two-part hostnames (apex is not a tenant slug)", async () => {
    const from = vi.fn((table: string) => {
      if (table === "saas_platform_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }
      if (table === "tenant_domains") {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === "custom_domain") {
                return {
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                };
              }
              throw new Error("should not query subdomain for 2-part host");
            },
          }),
        };
      }
      throw new Error(table);
    });
    const r = await resolveTenantFromHostnameDb({ from } as unknown as SupabaseClient, "clienthotel.com");
    expect(r.tenant).toBeNull();
    expect(r.isSubdomain).toBe(false);
  });
});
