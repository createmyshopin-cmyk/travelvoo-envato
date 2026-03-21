import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EnvatoApiError, fetchAuthorSaleByCode, saleMatchesItem } from "@/lib/envato";
import { createLicenseCookieValue, LICENSE_COOKIE_NAME } from "@/lib/license-token";

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(req: Request) {
  const token = process.env.ENVATO_API_TOKEN;
  const itemIdRaw = process.env.ENVATO_ITEM_ID;
  const secret = process.env.LICENSE_SECRET;

  if (!token || !itemIdRaw || !secret) {
    return NextResponse.json(
      {
        error:
          "License is not configured on the server. Set ENVATO_API_TOKEN, ENVATO_ITEM_ID, and LICENSE_SECRET.",
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

  const purchaseCode =
    typeof body === "object" && body !== null && "purchaseCode" in body
      ? String((body as { purchaseCode?: unknown }).purchaseCode ?? "").trim()
      : "";

  if (!purchaseCode) {
    return NextResponse.json({ error: "Purchase code is required." }, { status: 400 });
  }

  try {
    const sale = await fetchAuthorSaleByCode(purchaseCode, token);
    if (!sale || !saleMatchesItem(sale, expectedItemId)) {
      return NextResponse.json(
        { error: "This purchase code is not valid for this product." },
        { status: 401 }
      );
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
