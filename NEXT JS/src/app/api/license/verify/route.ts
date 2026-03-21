import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeActivationDomain } from "@/lib/domain-normalize";
import { EnvatoApiError, fetchAuthorSaleByCode, saleMatchesItem } from "@/lib/envato";
import { createLicenseCookieValue, LICENSE_COOKIE_NAME } from "@/lib/license-token";
import { hashPurchaseCode } from "@/lib/purchase-code-hash";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";

const MAX_AGE = 60 * 60 * 24 * 365;

async function persistDomainRow(params: {
  domain: string;
  codeHash: string;
  envatoItemId: number;
  itemName: string;
  licenseLabel: string;
}): Promise<{ ok: true } | { error: "domain_conflict" } | { error: "db_unavailable" }> {
  try {
    const admin = createServiceRoleClient();
    const { data: existing } = await admin
      .from("envato_domain_licenses")
      .select("id, purchase_code_hash")
      .eq("domain", params.domain)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      if (existing.purchase_code_hash !== params.codeHash) {
        return { error: "domain_conflict" };
      }
      const { error } = await admin
        .from("envato_domain_licenses")
        .update({
          last_verified_at: now,
          revoked_at: null,
          item_name: params.itemName,
          license_label: params.licenseLabel,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (error) return { error: "db_unavailable" };
      return { ok: true };
    }

    const { error } = await admin.from("envato_domain_licenses").insert({
      domain: params.domain,
      purchase_code_hash: params.codeHash,
      envato_item_id: params.envatoItemId,
      item_name: params.itemName,
      license_label: params.licenseLabel,
      last_verified_at: now,
      updated_at: now,
    });
    if (error) return { error: "db_unavailable" };
    return { ok: true };
  } catch {
    return { error: "db_unavailable" };
  }
}

export async function POST(req: Request) {
  const token = process.env.ENVATO_API_TOKEN;
  const itemIdRaw = process.env.ENVATO_ITEM_ID;
  const secret = process.env.LICENSE_SECRET;

  if (!token || !itemIdRaw || !secret) {
    return NextResponse.json(
      {
        error:
          "License is not configured. Set ENVATO_API_TOKEN, ENVATO_ITEM_ID, and LICENSE_SECRET.",
      },
      { status: 503 }
    );
  }

  const expectedItemId = Number(itemIdRaw);
  if (Number.isNaN(expectedItemId)) {
    return NextResponse.json({ error: "ENVATO_ITEM_ID is invalid." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as { purchaseCode?: unknown; domain?: unknown };
  const purchaseCode = String(b.purchaseCode ?? "").trim();
  const domainRaw = b.domain != null ? String(b.domain).trim() : "";

  if (!purchaseCode) {
    return NextResponse.json({ error: "Purchase code is required." }, { status: 400 });
  }

  const requireDomain = process.env.LICENSE_REQUIRE_DOMAIN === "true";
  if (requireDomain && !domainRaw) {
    return NextResponse.json({ error: "Domain is required for this deployment." }, { status: 400 });
  }

  const domainNorm = domainRaw ? normalizeActivationDomain(domainRaw) : "";
  if (domainRaw && !domainNorm) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  try {
    const sale = await fetchAuthorSaleByCode(purchaseCode, token);
    if (!sale || !saleMatchesItem(sale, expectedItemId)) {
      return NextResponse.json(
        { error: "This purchase code is not valid for this product." },
        { status: 401 }
      );
    }

    const codeHash = hashPurchaseCode(purchaseCode, secret);
    let domainPersist: "ok" | "skipped" | "conflict" | "error" = "skipped";

    if (domainNorm && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const row = await persistDomainRow({
        domain: domainNorm,
        codeHash,
        envatoItemId: expectedItemId,
        itemName: sale.item?.name ?? "",
        licenseLabel: sale.license ?? "",
      });
      if ("error" in row && row.error === "domain_conflict") {
        domainPersist = "conflict";
        return NextResponse.json(
          {
            error:
              "This domain is already registered with a different purchase code. Contact support or revoke the old activation in SaaS Admin.",
          },
          { status: 409 }
        );
      }
      if ("error" in row) {
        domainPersist = "error";
      } else {
        domainPersist = "ok";
      }
    }

    const value = await createLicenseCookieValue(expectedItemId, secret, MAX_AGE);
    const jar = await cookies();
    jar.set(LICENSE_COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    });

    return NextResponse.json({
      ok: true,
      itemName: sale.item?.name ?? "",
      license: sale.license ?? "",
      soldAt: sale.sold_at ?? "",
      domain: domainNorm || null,
      domainPersist,
    });
  } catch (e) {
    if (e instanceof EnvatoApiError) {
      return NextResponse.json(
        { error: `Envato API error (${e.status}). Check your API token and permissions.` },
        { status: 502 }
      );
    }
    throw e;
  }
}
