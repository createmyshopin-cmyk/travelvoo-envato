import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends an Expo push notification to a tenant when a new booking arrives.
 *
 * Called as a Supabase Database Webhook on bookings INSERT, OR directly
 * from any edge function / client with a payload like:
 *   { record: { id, booking_id, guest_name, stay_id, tenant_id, ... } }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Supports both direct call and Supabase DB webhook payload
    const record = body.record ?? body;

    const tenantId: string = record.tenant_id;
    const guestName: string = record.guest_name || "Guest";
    const bookingId: string = record.booking_id || record.id;

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the tenant's Expo push token
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("expo_push_token, tenant_name")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant?.expo_push_token) {
      return new Response(JSON.stringify({ skipped: "No push token registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Expo Push API
    const pushPayload = {
      to: tenant.expo_push_token,
      title: "New Booking 🏨",
      body: `${guestName} just made a booking (#${bookingId})`,
      data: { bookingId, tenantId },
      sound: "default",
      priority: "high",
    };

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushRes.json();

    return new Response(JSON.stringify({ sent: true, result: pushResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
