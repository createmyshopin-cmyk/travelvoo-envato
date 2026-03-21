import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verifies Razorpay payment and records a transaction + marketplace install (service role).
 */
export async function POST(req: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  if (!keySecret || !keyId || !serviceKey) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabaseUser = createClient<Database>(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData } = await supabaseUser.auth.getUser();
  if (!userData.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tenantId, error: tidErr } = await supabaseUser.rpc("get_my_tenant_id");
  if (tidErr || !tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    marketplace_item_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  const itemId = body.marketplace_item_id;

  if (!orderId || !paymentId || !signature || !itemId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (!safeEqual(expected, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const payment = (await payRes.json()) as { amount?: number; status?: string; order_id?: string; error?: { description?: string } };
  if (!payRes.ok || payment.order_id !== orderId) {
    return NextResponse.json({ error: payment.error?.description || "Payment lookup failed" }, { status: 400 });
  }
  if (payment.status !== "authorized" && payment.status !== "captured") {
    return NextResponse.json({ error: `Payment not complete: ${payment.status}` }, { status: 400 });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

  const { data: item, error: itemErr } = await supabaseAdmin.from("marketplace_items").select("*").eq("id", itemId).single();
  if (itemErr || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const expectedPaise = Math.round(Number(item.price) * 100);
  if (!Number.isFinite(expectedPaise) || (payment.amount ?? 0) !== expectedPaise) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const txRow = {
    tenant_id: tenantId,
    transaction_id: paymentId,
    amount: Number(item.price),
    currency: item.currency || "INR",
    status: "success",
    payment_gateway: "razorpay",
    payment_method: "razorpay",
    marketplace_item_id: itemId,
    metadata: {
      order_id: orderId,
      pricing_model: item.pricing_model,
      billing_interval: item.billing_interval,
    } as unknown as Database["public"]["Tables"]["transactions"]["Insert"]["metadata"],
  };

  const { data: existingTx } = await supabaseAdmin.from("transactions").select("id").eq("transaction_id", paymentId).maybeSingle();
  if (!existingTx) {
    const { error: txErr } = await supabaseAdmin.from("transactions").insert(txRow);
    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }
  }

  const paidUntil =
    item.pricing_model === "recurring"
      ? new Date(
          Date.now() +
            (item.billing_interval === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

  const { error: insErr } = await supabaseAdmin.from("tenant_marketplace_installs").upsert(
    {
      tenant_id: tenantId,
      item_id: itemId,
      status: "installed",
      config: paidUntil ? { marketplace: { paid_until: paidUntil } } : {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,item_id" }
  );

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, transaction_id: paymentId });
}
