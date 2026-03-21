import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Creates a Razorpay order for a marketplace item (tenant checkout).
 * Requires RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET server-side.
 */
export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured on the server", code: "RAZORPAY_DISABLED" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tenantId, error: tidErr } = await supabase.rpc("get_my_tenant_id");
  if (tidErr || !tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  let body: { item_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const itemId = body.item_id;
  if (!itemId) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const { data: item, error: itemErr } = await supabase.from("marketplace_items").select("*").eq("id", itemId).single();
  if (itemErr || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (!item.is_published) {
    return NextResponse.json({ error: "Item not available" }, { status: 400 });
  }

  if (item.pricing_model === "free" || Number(item.price) <= 0) {
    return NextResponse.json({ error: "Item is free — install without payment" }, { status: 400 });
  }

  const amountInr = Number(item.price);
  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    return NextResponse.json({ error: "Invalid item price" }, { status: 400 });
  }

  const amountPaise = Math.round(amountInr * 100);
  const receipt = `mp_${String(itemId).slice(0, 8)}_${Date.now()}`.slice(0, 40);

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: item.currency || "INR",
      receipt,
      notes: {
        marketplace_item_id: itemId,
        tenant_id: tenantId,
        pricing_model: item.pricing_model,
        billing_interval: item.billing_interval ?? "",
      },
    }),
  });

  const orderJson = (await orderRes.json()) as { id?: string; error?: { description?: string } };
  if (!orderRes.ok || !orderJson.id) {
    return NextResponse.json(
      { error: orderJson.error?.description || "Failed to create Razorpay order" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    order_id: orderJson.id,
    key_id: keyId,
    amount: amountPaise,
    currency: item.currency || "INR",
    item_name: item.name,
  });
}
