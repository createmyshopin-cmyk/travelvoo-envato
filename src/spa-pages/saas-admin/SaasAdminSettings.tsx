import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { dispatchPlatformCurrencyChange, useCurrency } from "@/context/CurrencyContext";
import { Settings, Shield, Globe, Mail, CreditCard, Clock, Save, Building2, Server, Copy, CheckCheck, Instagram, RefreshCw } from "lucide-react";

/** Keys in `saas_platform_settings` for the General + Trial + Security cards (single source of truth in DB). */
const GENERAL_SETTING_KEYS = [
  "platform_name",
  "support_email",
  "default_currency",
  "max_tenants_allowed",
  "footer_text",
  "default_trial_days",
  "default_plan_id",
  "auto_approve_signups",
  "require_email_verification",
  "maintenance_mode",
] as const;

type SettingsState = {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  defaultCurrency: string;
  maintenanceMode: boolean;
  autoApproveSignups: boolean;
  requireEmailVerification: boolean;
  maxTenantsAllowed: number;
  defaultPlanId: string;
  footerText: string;
  termsUrl: string;
  privacyUrl: string;
  smtpConfigured: boolean;
  razorpayConfigured: boolean;
  entriApplicationId: string;
  entriSecret: string;
  domainMethodGodaddy: boolean;
  domainMethodHostinger: boolean;
  domainMethodEntri: boolean;
  platformBaseDomain: string;
  platformCnameTarget: string;
  platformARecordIp: string;
  platformSubdomainSuffix: string;
  platformDnsTtl: string;
};

function mapGeneralDbToState(m: Record<string, string>): Partial<SettingsState> {
  const out: Partial<SettingsState> = {};
  if (m.platform_name != null) out.platformName = m.platform_name;
  if (m.support_email != null) out.supportEmail = m.support_email;
  if (m.default_currency != null) out.defaultCurrency = m.default_currency;
  if (m.max_tenants_allowed != null) out.maxTenantsAllowed = Number.parseInt(m.max_tenants_allowed, 10) || -1;
  if (m.footer_text != null) out.footerText = m.footer_text;
  if (m.default_trial_days != null) out.defaultTrialDays = Number.parseInt(m.default_trial_days, 10) || 14;
  if (m.default_plan_id != null) out.defaultPlanId = m.default_plan_id;
  if (m.auto_approve_signups != null) out.autoApproveSignups = m.auto_approve_signups === "true";
  if (m.require_email_verification != null) out.requireEmailVerification = m.require_email_verification === "true";
  if (m.maintenance_mode != null) out.maintenanceMode = m.maintenance_mode === "true";
  return out;
}

const SaasAdminSettings = () => {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dnsSaving, setDnsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    platformName: "TravelVoo",
    supportEmail: "support@travelvoo.in",
    defaultTrialDays: 14,
    defaultCurrency: "USD",
    maintenanceMode: false,
    autoApproveSignups: true,
    requireEmailVerification: true,
    maxTenantsAllowed: -1,
    defaultPlanId: "",
    footerText: "© 2026 TravelVoo. All rights reserved.",
    termsUrl: "",
    privacyUrl: "",
    smtpConfigured: false,
    razorpayConfigured: false,
    entriApplicationId: "",
    entriSecret: "",
    domainMethodGodaddy: true,
    domainMethodHostinger: true,
    domainMethodEntri: true,
    platformBaseDomain: "travelvoo.in",
    platformCnameTarget: "cname.vercel-dns.com",
    platformARecordIp: "216.198.79.1",
    platformSubdomainSuffix: ".travelvoo.in",
    platformDnsTtl: "600",
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [entriSaving, setEntriSaving] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [meta, setMeta] = useState({
    metaAppId: "",
    instagramAppId: "",
    metaAppSecret: "",
    webhookVerifyToken: "",
    graphApiVersion: "v25.0",
    oauthRedirectUri: "",
    hasSecret: false,
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: p } = await supabase.from("plans").select("id, plan_name, price").eq("status", "active").order("price");
    setPlans(p || []);
    const saved = localStorage.getItem("saas_platform_settings");
    if (saved) {
      try { setSettings((s) => ({ ...s, ...JSON.parse(saved) })); } catch {}
    }
    // Fetch Entri credentials from DB
    const DNS_KEYS = [
      "entri_application_id", "entri_secret",
      "domain_method_godaddy", "domain_method_hostinger", "domain_method_entri",
      "platform_base_domain", "platform_cname_target", "platform_a_record_ip",
      "platform_subdomain_suffix", "platform_dns_ttl",
    ];
    const { data: entriRows } = await supabase.from("saas_platform_settings" as any).select("setting_key, setting_value").in("setting_key", DNS_KEYS);
    if (entriRows) {
      const map: Record<string, string> = {};
      (entriRows as any[]).forEach((r: any) => { map[r.setting_key] = r.setting_value; });
      setSettings((s) => ({
        ...s,
        entriApplicationId: map.entri_application_id || "",
        entriSecret: map.entri_secret || "",
        domainMethodGodaddy: map.domain_method_godaddy !== "false",
        domainMethodHostinger: map.domain_method_hostinger !== "false",
        domainMethodEntri: map.domain_method_entri !== "false",
        platformBaseDomain: map.platform_base_domain || "travelvoo.in",
        platformCnameTarget: map.platform_cname_target || "cname.vercel-dns.com",
        platformARecordIp: map.platform_a_record_ip || "216.198.79.1",
        platformSubdomainSuffix: map.platform_subdomain_suffix || ".travelvoo.in",
        platformDnsTtl: map.platform_dns_ttl || "600",
      }));
    }
    const { data: generalRows } = await supabase
      .from("saas_platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [...GENERAL_SETTING_KEYS]);
    const gm: Record<string, string> = {};
    (generalRows || []).forEach((r: { setting_key: string; setting_value: string }) => {
      gm[r.setting_key] = r.setting_value;
    });
    const fromDb = mapGeneralDbToState(gm);
    if (Object.keys(fromDb).length > 0) {
      setSettings((s) => ({ ...s, ...fromDb }));
      try {
        const raw = localStorage.getItem("saas_platform_settings");
        const obj = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          "saas_platform_settings",
          JSON.stringify({ ...obj, ...fromDb, defaultCurrency: fromDb.defaultCurrency ?? obj.defaultCurrency }),
        );
      } catch { /* ignore */ }
    }
    // Fetch Meta platform credentials
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const mRes = await fetch("/api/saas-admin/meta-credentials", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (mRes.ok) {
          const mc = await mRes.json();
          setMeta((m) => ({
            ...m,
            metaAppId: mc.meta_app_id || "",
            instagramAppId: mc.instagram_app_id || "",
            webhookVerifyToken: mc.webhook_verify_token || "",
            graphApiVersion: mc.graph_api_version || "v25.0",
            oauthRedirectUri: mc.oauth_redirect_uri || "",
            hasSecret: !!mc.has_secret,
          }));
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const upsertPlatformSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from("saas_platform_settings" as any).select("id").eq("setting_key", key).maybeSingle();
    if (existing) {
      await supabase.from("saas_platform_settings" as any).update({ setting_value: value, updated_at: new Date().toISOString() } as any).eq("setting_key", key);
    } else {
      await supabase.from("saas_platform_settings" as any).insert({ setting_key: key, setting_value: value } as any);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertPlatformSetting("platform_name", settings.platformName),
        upsertPlatformSetting("support_email", settings.supportEmail),
        upsertPlatformSetting("default_currency", settings.defaultCurrency),
        upsertPlatformSetting("max_tenants_allowed", String(settings.maxTenantsAllowed)),
        upsertPlatformSetting("footer_text", settings.footerText),
        upsertPlatformSetting("default_trial_days", String(settings.defaultTrialDays)),
        upsertPlatformSetting("default_plan_id", settings.defaultPlanId),
        upsertPlatformSetting("auto_approve_signups", String(settings.autoApproveSignups)),
        upsertPlatformSetting("require_email_verification", String(settings.requireEmailVerification)),
        upsertPlatformSetting("maintenance_mode", String(settings.maintenanceMode)),
      ]);
      localStorage.setItem("saas_platform_settings", JSON.stringify(settings));
      dispatchPlatformCurrencyChange(settings.defaultCurrency);
      toast({ title: "Settings saved", description: "Platform settings synced to the database." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Could not save settings", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveEntriCredentials = async () => {
    setEntriSaving(true);
    try {
      const upsertSetting = async (key: string, value: string) => {
        const { data: existing } = await supabase.from("saas_platform_settings" as any).select("id").eq("setting_key", key).single();
        if (existing) {
          await supabase.from("saas_platform_settings" as any).update({ setting_value: value, updated_at: new Date().toISOString() } as any).eq("setting_key", key);
        } else {
          await supabase.from("saas_platform_settings" as any).insert({ setting_key: key, setting_value: value } as any);
        }
      };
      await upsertSetting("entri_application_id", settings.entriApplicationId);
      await upsertSetting("entri_secret", settings.entriSecret);
      await upsertSetting("domain_method_godaddy", String(settings.domainMethodGodaddy));
      await upsertSetting("domain_method_hostinger", String(settings.domainMethodHostinger));
      await upsertSetting("domain_method_entri", String(settings.domainMethodEntri));
      toast({ title: "Domain settings saved securely" });
    } catch (err: any) {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    }
    setEntriSaving(false);
  };

  const saveMetaCredentials = async () => {
    setMetaSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const payload: Record<string, string> = {
        meta_app_id: meta.metaAppId,
        instagram_app_id: meta.instagramAppId,
        webhook_verify_token: meta.webhookVerifyToken,
        graph_api_version: meta.graphApiVersion,
        oauth_redirect_uri: meta.oauthRedirectUri,
      };
      if (meta.metaAppSecret) payload.app_secret = meta.metaAppSecret;
      const res = await fetch("/api/saas-admin/meta-credentials", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      setMeta((m) => ({ ...m, metaAppSecret: "", hasSecret: !!meta.metaAppSecret || m.hasSecret }));
      toast({ title: "Meta credentials saved" });
    } catch (err: any) {
      toast({ title: "Error saving Meta credentials", description: err.message, variant: "destructive" });
    }
    setMetaSaving(false);
  };

  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const saveDnsConfig = async () => {
    setDnsSaving(true);
    try {
      const upsert = async (key: string, value: string) => {
        const { data: existing } = await supabase.from("saas_platform_settings" as any).select("id").eq("setting_key", key).single();
        if (existing) {
          await supabase.from("saas_platform_settings" as any).update({ setting_value: value, updated_at: new Date().toISOString() } as any).eq("setting_key", key);
        } else {
          await supabase.from("saas_platform_settings" as any).insert({ setting_key: key, setting_value: value } as any);
        }
      };
      await Promise.all([
        upsert("platform_base_domain", settings.platformBaseDomain),
        upsert("platform_cname_target", settings.platformCnameTarget),
        upsert("platform_a_record_ip", settings.platformARecordIp),
        upsert("platform_subdomain_suffix", settings.platformSubdomainSuffix),
        upsert("platform_dns_ttl", settings.platformDnsTtl),
      ]);
      toast({ title: "Platform DNS configuration saved" });
    } catch (err: any) {
      toast({ title: "Error saving DNS config", description: err.message, variant: "destructive" });
    }
    setDnsSaving(false);
  };

  const copyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateWebhookVerifyToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    setMeta((m) => ({ ...m, webhookVerifyToken: token }));
    toast({
      title: "Verify token generated",
      description: "Click Save Meta Credentials to store it in the database, then paste the same value in Meta → Webhooks.",
    });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">Configure global SaaS platform settings</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Platform Name</Label>
              <Input value={settings.platformName} onChange={(e) => update("platformName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input type="email" value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Default Currency</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={async (v) => {
                  update("defaultCurrency", v);
                  try {
                    const raw = localStorage.getItem("saas_platform_settings");
                    const obj = raw ? JSON.parse(raw) : {};
                    localStorage.setItem("saas_platform_settings", JSON.stringify({ ...obj, defaultCurrency: v }));
                  } catch { /* ignore */ }
                  dispatchPlatformCurrencyChange(v);
                  try {
                    await upsertPlatformSetting("default_currency", v);
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    toast({ title: "Could not save currency to database", description: message, variant: "destructive" });
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Tenants (-1 = unlimited)</Label>
              <Input type="number" value={settings.maxTenantsAllowed} onChange={(e) => update("maxTenantsAllowed", parseInt(e.target.value) || -1)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Footer Text</Label>
            <Input value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Trial & Onboarding */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Trial & Onboarding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Default Trial Duration (days)</Label>
              <Input type="number" value={settings.defaultTrialDays} onChange={(e) => update("defaultTrialDays", parseInt(e.target.value) || 14)} className="mt-1" />
            </div>
            <div>
              <Label>Default Plan for New Tenants</Label>
              <Select value={settings.defaultPlanId} onValueChange={(v) => update("defaultPlanId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.plan_name} — {format(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Auto-approve Signups</p>
              <p className="text-xs text-muted-foreground">Allow tenants to start immediately without manual approval</p>
            </div>
            <Switch checked={settings.autoApproveSignups} onCheckedChange={(v) => update("autoApproveSignups", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Require Email Verification</p>
              <p className="text-xs text-muted-foreground">Tenants must verify email before accessing the dashboard</p>
            </div>
            <Switch checked={settings.requireEmailVerification} onCheckedChange={(v) => update("requireEmailVerification", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security & Access</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Block all tenant access and show maintenance page</p>
            </div>
            <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => update("maintenanceMode", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Razorpay Payments</p>
              <p className="text-xs text-muted-foreground">Payment gateway for tenant subscriptions</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${settings.razorpayConfigured ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {settings.razorpayConfigured ? "Connected" : "Not Configured"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Email / SMTP</p>
              <p className="text-xs text-muted-foreground">Transactional emails for invoices and notifications</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${settings.smtpConfigured ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {settings.smtpConfigured ? "Connected" : "Not Configured"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Meta / Instagram API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Instagram className="h-5 w-5 text-pink-500" /> Meta / Instagram API</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            App Secret is shared. Set <strong>Instagram App ID</strong> to use Instagram Business Login (oauth on instagram.com); otherwise set <strong>Facebook App ID</strong> for Facebook Login. Only super admins can edit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Facebook App ID</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                App Dashboard → Settings → Basic (or header). Used when <strong>Instagram App ID</strong> below is empty — Facebook Login → Page token.
              </p>
              <Input value={meta.metaAppId} onChange={(e) => setMeta((m) => ({ ...m, metaAppId: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="e.g. 1494635005587494" />
            </div>
            <div>
              <Label>App Secret {meta.hasSecret && <span className="text-xs text-green-600 ml-1">(saved)</span>}</Label>
              <Input type="password" value={meta.metaAppSecret} onChange={(e) => setMeta((m) => ({ ...m, metaAppSecret: e.target.value }))} className="mt-1 font-mono text-xs" placeholder={meta.hasSecret ? "Leave blank to keep current" : "Enter Meta App Secret"} />
            </div>
          </div>
          <div>
            <Label>Instagram App ID (recommended for Meta &quot;Instagram&quot; product)</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Meta → Instagram → API setup: <strong>Instagram app ID</strong> (not the Facebook App ID). When set, tenant <strong>Connect Instagram</strong> opens <code className="text-[11px] bg-muted px-1 rounded">instagram.com/oauth/authorize</code> per Meta Developer. Requires the same App Secret and valid OAuth redirect URIs for Instagram.
            </p>
            <Input
              value={meta.instagramAppId}
              onChange={(e) => setMeta((m) => ({ ...m, instagramAppId: e.target.value }))}
              className="mt-1 font-mono text-xs"
              placeholder="e.g. 1484662382996042"
            />
          </div>
          <div>
            <Label>Webhook Verify Token</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Must match Meta Developer → Webhooks → Verify Token. Use Generate, then Save Meta Credentials.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input
                value={meta.webhookVerifyToken}
                onChange={(e) => setMeta((m) => ({ ...m, webhookVerifyToken: e.target.value }))}
                className="font-mono text-xs flex-1 min-w-0"
                placeholder="64 hex chars (Generate) or your own secret"
              />
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={generateWebhookVerifyToken}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Generate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyValue("metaWebhook", meta.webhookVerifyToken)}
                  disabled={!meta.webhookVerifyToken}
                  aria-label="Copy webhook verify token"
                >
                  {copiedKey === "metaWebhook" ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label>Graph API Version</Label>
            <Input value={meta.graphApiVersion} onChange={(e) => setMeta((m) => ({ ...m, graphApiVersion: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="v25.0" />
          </div>
          <div>
            <Label>OAuth Redirect URI</Label>
            <Input value={meta.oauthRedirectUri} onChange={(e) => setMeta((m) => ({ ...m, oauthRedirectUri: e.target.value }))} className="mt-1 font-mono text-xs" placeholder="https://yourdomain.com/api/integrations/instagram/callback" />
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                (meta.metaAppId || meta.instagramAppId) && meta.hasSecret ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              }`}
            >
              {(meta.metaAppId || meta.instagramAppId) && meta.hasSecret ? "Configured" : "Not Configured"}
            </span>
            <Button size="sm" onClick={saveMetaCredentials} disabled={metaSaving}>
              <Save className="w-3 h-3 mr-1" />{metaSaving ? "Saving..." : "Save Meta Credentials"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform DNS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Platform DNS Configuration</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Define the DNS records tenants must set when connecting a custom domain to this platform.
            These values are shown in tenant DNS setup guides.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Platform Base Domain</Label>
              <p className="text-xs text-muted-foreground mb-1">Root domain of this platform</p>
              <div className="flex gap-1">
                <Input
                  value={settings.platformBaseDomain}
                  onChange={(e) => update("platformBaseDomain", e.target.value)}
                  className="font-mono text-xs"
                  placeholder="travelvoo.in"
                />
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyValue("baseDomain", settings.platformBaseDomain)}>
                  {copiedKey === "baseDomain" ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Subdomain Suffix</Label>
              <p className="text-xs text-muted-foreground mb-1">Format shown to tenants for platform subdomains</p>
              <div className="flex gap-1">
                <Input
                  value={settings.platformSubdomainSuffix}
                  onChange={(e) => update("platformSubdomainSuffix", e.target.value)}
                  className="font-mono text-xs"
                  placeholder=".travelvoo.in"
                />
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyValue("suffix", settings.platformSubdomainSuffix)}>
                  {copiedKey === "suffix" ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* DNS Records */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Required DNS Records for Custom Domains
            </div>
            <div className="divide-y">
              {/* CNAME Row */}
              <div className="grid grid-cols-[80px_1fr_1fr_80px_auto] items-center gap-3 px-4 py-3 text-xs">
                <span className="font-mono font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 text-center">CNAME</span>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">Name / Host</p>
                  <span className="font-mono">@</span>
                </div>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">Points To / Value</p>
                  <Input
                    value={settings.platformCnameTarget}
                    onChange={(e) => update("platformCnameTarget", e.target.value)}
                    className="font-mono text-xs h-7 px-2"
                    placeholder="cname.vercel-dns.com"
                  />
                </div>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">TTL</p>
                  <Input
                    value={settings.platformDnsTtl}
                    onChange={(e) => update("platformDnsTtl", e.target.value)}
                    className="font-mono text-xs h-7 px-2 w-20"
                    placeholder="600"
                  />
                </div>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyValue("cname", settings.platformCnameTarget)}>
                  {copiedKey === "cname" ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {/* A Record Row */}
              <div className="grid grid-cols-[80px_1fr_1fr_80px_auto] items-center gap-3 px-4 py-3 text-xs">
                <span className="font-mono font-bold text-purple-600 bg-purple-50 rounded px-1.5 py-0.5 text-center">A</span>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">Name / Host</p>
                  <span className="font-mono">@</span>
                </div>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">IP Address</p>
                  <Input
                    value={settings.platformARecordIp}
                    onChange={(e) => update("platformARecordIp", e.target.value)}
                    className="font-mono text-xs h-7 px-2"
                    placeholder="185.158.133.1"
                  />
                </div>
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground mb-0.5">TTL</p>
                  <span className="font-mono text-muted-foreground">{settings.platformDnsTtl}</span>
                </div>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyValue("arecord", settings.platformARecordIp)}>
                  {copiedKey === "arecord" ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={saveDnsConfig} disabled={dnsSaving}>
              <Save className="w-3.5 h-3.5 mr-1.5" />{dnsSaving ? "Saving..." : "Save DNS Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domain Setup Methods */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Domain Setup Methods</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Control which DNS auto-configuration methods are available to tenants</p>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">GoDaddy Auto-Configure</p>
              <p className="text-xs text-muted-foreground">Allow tenants to auto-configure DNS via GoDaddy API</p>
            </div>
            <Switch checked={settings.domainMethodGodaddy} onCheckedChange={(v) => update("domainMethodGodaddy", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Hostinger Auto-Configure</p>
              <p className="text-xs text-muted-foreground">Allow tenants to auto-configure DNS via Hostinger API</p>
            </div>
            <Switch checked={settings.domainMethodHostinger} onCheckedChange={(v) => update("domainMethodHostinger", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Entri Universal Setup</p>
              <p className="text-xs text-muted-foreground">Allow tenants to use Entri for 40+ registrar DNS setup</p>
            </div>
            <Switch checked={settings.domainMethodEntri} onCheckedChange={(v) => update("domainMethodEntri", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Entri Domain Configuration */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Entri DNS Credentials</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Entri enables tenants to auto-configure DNS records with 40+ registrars. Get your credentials from{" "}
            <a href="https://www.entri.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">entri.com</a>
          </p>
          <div>
            <Label>Application ID</Label>
            <Input value={settings.entriApplicationId} onChange={(e) => update("entriApplicationId", e.target.value)} className="mt-1 font-mono text-xs" placeholder="Your Entri Application ID" />
          </div>
          <div>
            <Label>Secret</Label>
            <Input type="password" value={settings.entriSecret} onChange={(e) => update("entriSecret", e.target.value)} className="mt-1 font-mono text-xs" placeholder="Your Entri Secret" />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium px-2 py-1 rounded ${settings.entriApplicationId && settings.entriSecret ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {settings.entriApplicationId && settings.entriSecret ? "Configured" : "Not Configured"}
            </span>
            <Button size="sm" onClick={saveEntriCredentials} disabled={entriSaving}>
              <Save className="w-3 h-3 mr-1" />{entriSaving ? "Saving..." : "Save Domain Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Legal & Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Terms of Service URL</Label>
              <Input value={settings.termsUrl} onChange={(e) => update("termsUrl", e.target.value)} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label>Privacy Policy URL</Label>
              <Input value={settings.privacyUrl} onChange={(e) => update("privacyUrl", e.target.value)} className="mt-1" placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasAdminSettings;
