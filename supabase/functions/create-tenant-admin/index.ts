import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isSuperAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      email,
      password,
      tenant_name,
      owner_name,
      phone,
      subdomain,
      plan_id,
    } = body as {
      email: string;
      password: string;
      tenant_name: string;
      owner_name?: string;
      phone?: string;
      subdomain?: string;
      plan_id?: string;
    };

    if (!email?.trim() || !password || !tenant_name?.trim()) {
      return new Response(JSON.stringify({ error: "email, password, and tenant_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = subdomain
      ? String(subdomain).toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "")
      : "";

    if (slug && slug.length >= 2) {
      const { data: existing } = await adminClient
        .from("tenant_domains")
        .select("id")
        .eq("subdomain", slug)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: `Subdomain "${slug}" is already taken` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let planId = plan_id || null;
    if (!planId) {
      const { data: starterPlan } = await adminClient
        .from("plans")
        .select("id")
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(1)
        .single();
      planId = starterPlan?.id || null;
    }
    if (!planId) {
      return new Response(JSON.stringify({ error: "No active plan found. Please add a plan first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authUser, error: createUserErr } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createUserErr) {
      const msg = createUserErr.message?.toLowerCase() || "";
      if (msg.includes("already been registered") || msg.includes("already exists")) {
        return new Response(JSON.stringify({ error: "This email is already registered" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createUserErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!authUser.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.user.id;
    const domainValue = slug || tenant_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const { data: newTenant, error: tenantErr } = await adminClient
      .from("tenants")
      .insert({
        tenant_name: tenant_name.trim(),
        owner_name: (owner_name || "").trim(),
        email: email.trim().toLowerCase(),
        phone: (phone || "").trim(),
        domain: domainValue,
        plan_id: planId,
        status: "trial",
        user_id: userId,
      })
      .select()
      .single();

    if (tenantErr) {
      return new Response(JSON.stringify({ error: tenantErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    await adminClient.from("subscriptions").insert({
      tenant_id: newTenant.id,
      plan_id: planId,
      status: "trial",
      billing_cycle: "monthly",
      renewal_date: trialEnd.toISOString().split("T")[0],
    });

    if (slug) {
      await adminClient.from("tenant_domains").insert({
        tenant_id: newTenant.id,
        subdomain: slug,
      });
    }

    await adminClient.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );

    const { error: usageErr } = await adminClient.from("tenant_usage").insert({
      tenant_id: newTenant.id,
    });
    if (usageErr && !usageErr.message?.includes("duplicate")) {
    }

    return new Response(JSON.stringify({ success: true, tenant_id: newTenant.id, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
