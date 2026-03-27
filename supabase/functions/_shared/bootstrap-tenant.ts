import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type BootstrapTenantInput = {
  userId: string;
  companyName: string;
  email: string;
  phone: string;
  subdomain: string;
  planId: string | null;
};

/** Inserts tenant + domain + site_settings (clone from platform row) + subscription + usage + admin role. */
export async function bootstrapTenant(
  admin: SupabaseClient,
  input: BootstrapTenantInput,
): Promise<{ tenantId: string }> {
  const slug = input.subdomain.trim().toLowerCase();
  if (!slug || slug.length < 2) {
    throw new Error("Invalid subdomain");
  }

  const { data: taken } = await admin
    .from("tenant_domains")
    .select("id")
    .eq("subdomain", slug)
    .maybeSingle();
  if (taken) {
    throw new Error("Subdomain already taken");
  }

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({
      tenant_name: input.companyName,
      owner_name: input.companyName,
      email: input.email,
      phone: input.phone || "0",
      domain: slug,
      status: "trial",
      plan_id: input.planId,
      user_id: input.userId,
      is_platform: false,
    })
    .select("id")
    .single();

  if (tenantErr) throw tenantErr;
  if (!tenant?.id) throw new Error("Failed to create tenant");

  const tenantId = tenant.id as string;

  const { data: autoVerifyRow } = await admin
    .from("saas_platform_settings")
    .select("setting_value")
    .eq("setting_key", "signup_auto_verify")
    .maybeSingle();
  const verified = (autoVerifyRow as { setting_value?: string } | null)?.setting_value === "true";
  const { data: defaultCurrencyRow } = await admin
    .from("saas_platform_settings")
    .select("setting_value")
    .eq("setting_key", "default_currency")
    .maybeSingle();
  const defaultCurrency = (defaultCurrencyRow as { setting_value?: string } | null)?.setting_value || "INR";

  const { error: domainErr } = await admin.from("tenant_domains").insert({
    tenant_id: tenantId,
    subdomain: slug,
    custom_domain: "",
    verified,
    auto_configured: false,
    registrar: "internal",
    ssl_status: verified ? "active" : "pending",
  });
  if (domainErr) throw domainErr;

  const { data: platformTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("is_platform", true)
    .maybeSingle();

  if (platformTenant?.id) {
    const { data: template } = await admin
      .from("site_settings")
      .select("*")
      .eq("tenant_id", platformTenant.id)
      .limit(1)
      .maybeSingle();

    if (template) {
      const row = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
      delete row.id;
      row.tenant_id = tenantId;
      row.site_name = input.companyName;
      row.contact_email = input.email;
      row.contact_phone = input.phone || "";
      row.whatsapp_number = input.phone || "";
      row.meta_title = input.companyName;
      row.currency = defaultCurrency;
      row.updated_at = new Date().toISOString();
      const { error: ssErr } = await admin.from("site_settings").insert(row as never);
      if (ssErr) throw ssErr;
    } else {
      const { error: ssErr } = await admin.from("site_settings").insert({
        tenant_id: tenantId,
        site_name: input.companyName,
        contact_email: input.email,
        contact_phone: input.phone || "",
        whatsapp_number: input.phone || "",
        address: "",
        currency: defaultCurrency,
        booking_enabled: true,
        maintenance_mode: false,
        meta_title: input.companyName,
        meta_description: "",
        meta_keywords: "",
        menu_popup_title: "",
        gcal_calendar_id: "",
        gcal_enabled: false,
        gcal_webhook_url: "",
        theme_tokens: {},
        auto_generate_invoice: false,
        best_features_enabled: false,
        best_features_title: "",
        coupon_banner_enabled: false,
        menu_popup_enabled: false,
        sticky_bottom_nav_enabled: false,
        sticky_header_enabled: false,
        sticky_menu_enabled: true,
        sticky_menu_show_ai: true,
        sticky_menu_show_explore: true,
        sticky_menu_show_reels: true,
        sticky_menu_show_wishlist: true,
      } as never);
      if (ssErr) throw ssErr;
    }
  } else {
    const { error: ssErr } = await admin.from("site_settings").insert({
      tenant_id: tenantId,
      site_name: input.companyName,
      contact_email: input.email,
      contact_phone: input.phone || "",
      whatsapp_number: input.phone || "",
      address: "",
      currency: defaultCurrency,
      booking_enabled: true,
      maintenance_mode: false,
      meta_title: input.companyName,
      meta_description: "",
      meta_keywords: "",
      menu_popup_title: "",
      gcal_calendar_id: "",
      gcal_enabled: false,
      gcal_webhook_url: "",
      theme_tokens: {},
      auto_generate_invoice: false,
      best_features_enabled: false,
      best_features_title: "",
      coupon_banner_enabled: false,
      menu_popup_enabled: false,
      sticky_bottom_nav_enabled: false,
      sticky_header_enabled: false,
      sticky_menu_enabled: true,
      sticky_menu_show_ai: true,
      sticky_menu_show_explore: true,
      sticky_menu_show_reels: true,
      sticky_menu_show_wishlist: true,
    } as never);
    if (ssErr) throw ssErr;
  }

  if (input.planId) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    const { error: subErr } = await admin.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: input.planId,
      status: "trial",
      billing_cycle: "monthly",
      renewal_date: trialEnd.toISOString().split("T")[0],
      start_date: new Date().toISOString().split("T")[0],
      payment_gateway: "razorpay",
    });
    if (subErr) throw subErr;
  }

  const { error: usageErr } = await admin.from("tenant_usage").insert({ tenant_id: tenantId });
  if (usageErr) throw usageErr;

  const { error: roleErr } = await admin.from("user_roles").insert({
    user_id: input.userId,
    role: "admin",
  });
  if (roleErr && (roleErr as { code?: string }).code !== "23505") throw roleErr;

  return { tenantId };
}
