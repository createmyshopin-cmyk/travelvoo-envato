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
import { Settings, Shield, Globe, Mail, CreditCard, Clock, Save, Building2, Server, Copy, CheckCheck } from "lucide-react";

const SaasAdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dnsSaving, setDnsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    platformName: "TravelVoo",
    supportEmail: "support@travelvoo.in",
    defaultTrialDays: 14,
    defaultCurrency: "INR",
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
    setLoading(false);
  };

  const save = () => {
    setSaving(true);
    localStorage.setItem("saas_platform_settings", JSON.stringify(settings));
    setTimeout(() => {
      toast({ title: "Settings saved" });
      setSaving(false);
    }, 300);
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
              <Select value={settings.defaultCurrency} onValueChange={(v) => update("defaultCurrency", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
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
                    <SelectItem key={p.id} value={p.id}>{p.plan_name} — ₹{p.price}</SelectItem>
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
