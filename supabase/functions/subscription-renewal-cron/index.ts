import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns next renewal date based on billing cycle
function nextRenewalDate(from: Date, billingCycle: string): Date {
  const d = new Date(from);
  switch (billingCycle) {
    case "yearly":    d.setFullYear(d.getFullYear() + 1); break;
    case "6months":   d.setMonth(d.getMonth() + 6); break;
    case "3months":   d.setMonth(d.getMonth() + 3); break;
    case "monthly":
    case "30days":    d.setDate(d.getDate() + 30); break;
    case "14days":    d.setDate(d.getDate() + 14); break;
    case "7days":     d.setDate(d.getDate() + 7); break;
    case "3days":     d.setDate(d.getDate() + 3); break;
    default:          d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Auto-expire trial subscriptions past their renewal_date
    const { data: expiredTrials } = await supabaseAdmin
      .from("subscriptions")
      .select("id, tenant_id")
      .eq("status", "trial")
      .lte("renewal_date", today);

    for (const t of expiredTrials || []) {
      await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", t.id);
      await supabaseAdmin.from("tenants").update({ status: "expired" }).eq("id", t.tenant_id);
    }

    // Find active subscriptions due for renewal today or overdue
    const { data: dueSubs, error: fetchErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*, tenants:tenant_id(id, tenant_name, email, phone, plan_id, status)")
      .eq("status", "active")
      .lte("renewal_date", today);

    if (fetchErr) throw fetchErr;

    const results: any[] = [];

    for (const sub of dueSubs || []) {
      const tenant = sub.tenants as any;
      if (!tenant || !sub.plan_id) continue;

      // Get plan price
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("*")
        .eq("id", sub.plan_id)
        .single();

      if (!plan || plan.price <= 0) {
        // Free plan — just extend
        const newRenewal = nextRenewalDate(new Date(), plan?.billing_cycle || sub.billing_cycle || "monthly");

        // Handle scheduled downgrade
        const newPlanId = sub.scheduled_plan_id || sub.plan_id;

        await supabaseAdmin.from("subscriptions").update({
          plan_id: newPlanId,
          renewal_date: newRenewal.toISOString().split("T")[0],
          scheduled_plan_id: null,
          scheduled_at: null,
        }).eq("id", sub.id);

        if (sub.scheduled_plan_id) {
          await supabaseAdmin.from("tenants").update({ plan_id: newPlanId }).eq("id", tenant.id);
        }

        results.push({ tenant_id: tenant.id, status: "renewed_free", plan: plan.plan_name });
        continue;
      }

      // For paid plans, attempt Razorpay charge
      try {
        const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

        // Handle scheduled downgrade on renewal
        let renewPlanId = sub.plan_id;
        let renewAmount = plan.price;

        if (sub.scheduled_plan_id) {
          const { data: newPlan } = await supabaseAdmin
            .from("plans")
            .select("*")
            .eq("id", sub.scheduled_plan_id)
            .single();
          if (newPlan) {
            renewPlanId = newPlan.id;
            renewAmount = newPlan.price;
          }
        }

        // Create order for renewal
        const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: renewAmount * 100,
            currency: "INR",
            receipt: `renewal_${tenant.id.substring(0, 8)}_${Date.now()}`,
            notes: { tenant_id: tenant.id, plan_id: renewPlanId, type: "auto_renewal" },
          }),
        });

        if (!orderRes.ok) {
          // Payment failed — mark as expired
          await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
          await supabaseAdmin.from("tenants").update({ status: "expired" }).eq("id", tenant.id);

          results.push({ tenant_id: tenant.id, status: "payment_failed", error: "Order creation failed" });
          continue;
        }

        const order = await orderRes.json();

        // Record the pending renewal order
        const txId = `RENEW-${Date.now().toString(36).toUpperCase()}`;
        await supabaseAdmin.from("transactions").insert({
          transaction_id: txId,
          tenant_id: tenant.id,
          amount: renewAmount,
          currency: "INR",
          payment_method: "razorpay",
          status: "pending",
          payment_gateway: "razorpay",
        });

        // Note: In a production system with Razorpay Subscriptions API,
        // the charge would be automatic. For one-time orders, we mark
        // the subscription as expired and the tenant must pay manually.
        await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
        await supabaseAdmin.from("tenants").update({ status: "expired" }).eq("id", tenant.id);

        results.push({
          tenant_id: tenant.id,
          status: "renewal_pending",
          order_id: order.id,
          amount: renewAmount,
        });
      } catch (payErr) {
        // Mark as expired on payment failure
        await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
        await supabaseAdmin.from("tenants").update({ status: "expired" }).eq("id", tenant.id);

        results.push({ tenant_id: tenant.id, status: "error", error: (payErr as Error).message });
      }
    }

    // Also process scheduled downgrades for today
    const { data: downgradeSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .not("scheduled_plan_id", "is", null)
      .eq("status", "active")
      .lte("renewal_date", today);

    for (const sub of downgradeSubs || []) {
      if (results.some(r => r.tenant_id === (sub as any).tenant_id)) continue;

      const newRenewal = new Date();
      newRenewal.setMonth(newRenewal.getMonth() + 1);

      await supabaseAdmin.from("subscriptions").update({
        plan_id: sub.scheduled_plan_id!,
        renewal_date: newRenewal.toISOString().split("T")[0],
        scheduled_plan_id: null,
        scheduled_at: null,
      }).eq("id", sub.id);

      await supabaseAdmin.from("tenants").update({
        plan_id: sub.scheduled_plan_id!,
      }).eq("tenant_id", sub.tenant_id);

      results.push({ tenant_id: sub.tenant_id, status: "downgraded" });
    }

    return new Response(JSON.stringify({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Renewal cron error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
