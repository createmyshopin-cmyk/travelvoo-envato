import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Globe, Shield, CheckCircle2, Clock, AlertCircle, Plus, RefreshCw,
  Loader2, Trash2, ArrowRight, ExternalLink, Copy, Check,
  Link2, Unlink, Settings2, Activity, WifiOff, Wifi,
  ChevronDown, ChevronUp, Info, Zap,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

type SetupMethod = "manual";

interface DomainRecord {
  id: string;
  tenant_id: string;
  subdomain: string;
  custom_domain: string;
  verified: boolean;
  ssl_status: string;
  registrar: string;
  auto_configured: boolean;
  created_at: string;
}

const SETUP_SQL = `-- Run in Supabase SQL Editor to fix domain RLS
CREATE POLICY "Tenant can manage own domains"
  ON public.tenant_domains FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Tenant can manage own registrar keys"
  ON public.tenant_registrar_keys FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());`;

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

interface PlatformDns {
  cnameTarget: string;
  aRecordIp: string;
  subdomainSuffix: string;
  dnsTtl: string;
  baseDomain: string;
}

const DNS_DEFAULTS: PlatformDns = {
  cnameTarget: "cname.vercel-dns.com",
  aRecordIp: "216.198.79.1",
  subdomainSuffix: ".travelvoo.in",
  dnsTtl: "600",
  baseDomain: "travelvoo.in",
};

const AdminAccountDomain = () => {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [expandedRegistrar, setExpandedRegistrar] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; domain: string }>({ open: false, id: "", domain: "" });
  const [rlsError, setRlsError] = useState(false);
  const [editSubdomain, setEditSubdomain] = useState(false);
  const [subdomainValue, setSubdomainValue] = useState("");
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [dns, setDns] = useState<PlatformDns>(DNS_DEFAULTS);

  const DNS_KEYS = ["platform_cname_target", "platform_a_record_ip", "platform_subdomain_suffix", "platform_dns_ttl", "platform_base_domain"];

  const applyDnsRows = useCallback((rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const m: Record<string, string> = {};
    rows.forEach((r: any) => { m[r.setting_key] = r.setting_value; });
    setDns({
      cnameTarget: m.platform_cname_target || DNS_DEFAULTS.cnameTarget,
      aRecordIp: m.platform_a_record_ip || DNS_DEFAULTS.aRecordIp,
      subdomainSuffix: m.platform_subdomain_suffix || DNS_DEFAULTS.subdomainSuffix,
      dnsTtl: m.platform_dns_ttl || DNS_DEFAULTS.dnsTtl,
      baseDomain: m.platform_base_domain || DNS_DEFAULTS.baseDomain,
    });
  }, []);

  // Real-time subscription to platform DNS changes
  useEffect(() => {
    const channel = supabase
      .channel("platform-dns-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saas_platform_settings" },
        async () => {
          const { data } = await supabase
            .from("saas_platform_settings" as any)
            .select("setting_key, setting_value")
            .in("setting_key", DNS_KEYS);
          if (data) applyDnsRows(data as any[]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [applyDnsRows]);

  const fetchData = useCallback(async () => {
    setRlsError(false);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: t, error: tErr } = tenantId
      ? await supabase.from("tenants").select("*").eq("id", tenantId).single()
      : { data: null, error: null };
    if (tErr) { setLoading(false); return; }
    setTenant(t);

    // Fetch platform DNS config set by super-admin
    const { data: dnsRows } = await supabase
      .from("saas_platform_settings" as any)
      .select("setting_key, setting_value")
      .in("setting_key", DNS_KEYS);
    applyDnsRows((dnsRows as any[]) || []);

    const { data: d, error: dErr } = await supabase.from("tenant_domains").select("*").eq("tenant_id", t.id).order("created_at", { ascending: true });
    if (dErr) {
      const msg = String(dErr.message || "").toLowerCase();
      if (msg.includes("row-level security") || msg.includes("rls") || msg.includes("policy")) {
        setRlsError(true);
      }
      setDomains([]);
    } else {
      setDomains((d || []) as DomainRecord[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied!", description: text });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopiedSQL(true);
    toast({ title: "SQL Copied" });
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const resetDialog = () => {
    setNewDomain("");
    setShowAdd(false);
  };

  const addDomain = async () => {
    if (!newDomain.trim() || !tenant) return;
    setAdding(true);

    const { error } = await supabase.from("tenant_domains").insert({
      tenant_id: tenant.id,
      custom_domain: newDomain.trim(),
      ssl_status: "pending",
      verified: false,
      registrar: "",
      auto_configured: false,
    } as any);

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("row-level security") || msg.includes("rls") || msg.includes("policy")) {
        setRlsError(true);
        toast({ title: "RLS Policy Error", description: "Run the SQL fix in Supabase first", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      setAdding(false);
      return;
    }

    // Register domain with Vercel project (non-blocking — failure is silent)
    supabase.functions.invoke("add-domain-to-vercel", { body: { domain: newDomain.trim() } });

    toast({ title: "Domain added", description: `Add CNAME record pointing to ${dns.cnameTarget}` });
    resetDialog();
    await fetchData();
    setAdding(false);
  };

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    try {
      // Try edge function first; fall back to DNS-over-HTTPS check
      const { data, error } = await supabase.functions.invoke("verify-domain", { body: { domain_id: domainId } });

      if (!error && data) {
        toast({
          title: data?.verified ? "Domain Verified!" : "Domain not verified yet",
          description: data?.message,
          variant: data?.verified ? "default" : "destructive",
        });
        await fetchData();
        setVerifying(null);
        return;
      }

      // Edge function unavailable — use Cloudflare DNS-over-HTTPS fallback
      const domain = domains.find((d) => d.id === domainId);
      if (!domain?.custom_domain) throw new Error("Domain not found");

      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.custom_domain)}&type=CNAME`,
        { headers: { Accept: "application/dns-json" } }
      );
      const json = await res.json();
      const answers: any[] = json?.Answer || [];
      const matched = answers.some(
        (a) => a.type === 5 && String(a.data).replace(/\.$/, "") === dns.cnameTarget
      );

      if (matched) {
        await supabase.from("tenant_domains").update({ verified: true, ssl_status: "active" } as any).eq("id", domainId);
        toast({ title: "Domain Verified!", description: `CNAME → ${dns.cnameTarget} confirmed` });
      } else {
        toast({
          title: "DNS not propagated yet",
          description: `No CNAME pointing to ${dns.cnameTarget} found. Check your registrar and try again in a few minutes.`,
          variant: "destructive",
        });
      }
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Verification check failed",
        description: "DNS lookup failed. Ensure your CNAME record is set and try again.",
        variant: "destructive",
      });
    }
    setVerifying(null);
  };

  const confirmRemoveDomain = (d: DomainRecord) => {
    setDeleteConfirm({ open: true, id: d.id, domain: d.custom_domain || d.subdomain });
  };

  const removeDomain = async () => {
    await supabase.from("tenant_domains").delete().eq("id", deleteConfirm.id);
    setDeleteConfirm({ open: false, id: "", domain: "" });
    toast({ title: "Domain removed" });
    await fetchData();
  };


  const updateSubdomain = async () => {
    if (!tenant || !subdomainValue.trim()) return;
    const slug = subdomainValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) { toast({ title: "Invalid subdomain", variant: "destructive" }); return; }
    setSavingSubdomain(true);

    const existing = domains.find((d) => d.subdomain);
    if (existing) {
      const { error } = await supabase.from("tenant_domains").update({ subdomain: slug } as any).eq("id", existing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Subdomain updated" }); }
    } else {
      const { error } = await supabase.from("tenant_domains").insert({ tenant_id: tenant.id, subdomain: slug, verified: true, ssl_status: "active" } as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Subdomain created" }); }
    }

    await supabase.from("tenants").update({ domain: slug }).eq("id", tenant.id);
    setEditSubdomain(false);
    setSavingSubdomain(false);
    await fetchData();
  };

  // --- Derived data ---
  const subdomainEntry = domains.find((d) => d.subdomain);
  const customDomains = domains.filter((d) => d.custom_domain);
  const verifiedCount = customDomains.filter((d) => d.verified).length;
  const pendingCount = customDomains.filter((d) => !d.verified).length;

  // --- RLS error screen ---
  if (rlsError) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-5">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 space-y-4 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive opacity-60" />
            <h3 className="text-lg font-bold">RLS Policy Fix Required</h3>
            <p className="text-sm text-muted-foreground">
              The <code className="bg-muted px-1.5 py-0.5 rounded text-xs">tenant_domains</code> table requires a policy update to allow tenant admins to manage their own domains.
            </p>
            <p className="text-xs text-muted-foreground">
              Open{" "}
              <a
                href={`https://supabase.com/dashboard/project/rqnxtcigfauzzjaqxzut/sql`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-0.5"
              >
                Supabase SQL Editor <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              and run this SQL:
            </p>
            <div className="relative">
              <pre className="text-left text-[10px] sm:text-xs bg-muted/60 rounded-lg p-3 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-all border">
                {SETUP_SQL}
              </pre>
              <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7 text-xs" onClick={copySQL}>
                {copiedSQL ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> I've run it — Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 px-2 sm:px-0 pb-8">
      {/* Header */}
      <motion.div {...fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Domain Settings
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage subdomains and custom domains</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1.5" /> Add Custom Domain
        </Button>
      </motion.div>

      {/* Stats row */}
      <motion.div {...fade} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-primary">{domains.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-600">{verifiedCount + (subdomainEntry ? 1 : 0)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subdomain card */}
      <motion.div {...fade} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" /> Platform Subdomain
              </h4>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSubdomainValue(subdomainEntry?.subdomain || tenant?.domain || ""); setEditSubdomain(true); }}>
                <Settings2 className="h-3 w-3 mr-1" /> {subdomainEntry ? "Edit" : "Set Up"}
              </Button>
            </div>

            {subdomainEntry ? (
              <div className="flex items-center justify-between bg-muted/40 rounded-lg p-3 gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{subdomainEntry.subdomain}{dns.subdomainSuffix}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Wifi className="h-2.5 w-2.5 text-green-500" /> Always active — no DNS setup needed
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="default" className="text-[10px] h-5">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Active
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => copyToClipboard(`${subdomainEntry.subdomain}${dns.subdomainSuffix}`, `sub-${subdomainEntry.id}`)}
                  >
                    {copiedId === `sub-${subdomainEntry.id}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-3 text-center text-xs text-muted-foreground">
                <WifiOff className="mx-auto h-5 w-5 mb-1 opacity-40" />
                No subdomain configured. Click "Set Up" above.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* DNS Setup Guide */}
      <motion.div {...fade} transition={{ delay: 0.15 }}>
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <h4 className="font-semibold text-sm">How to Connect Your Domain</h4>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">1</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Add your domain here</p>
                  <p className="text-xs text-muted-foreground">Click <span className="font-semibold text-foreground">Add Custom Domain</span> above and enter your full domain, e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">booking.myresort.com</code></p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                <div className="space-y-2 w-full">
                  <p className="text-sm font-medium">Add DNS records at your registrar</p>
                  <p className="text-xs text-muted-foreground">Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the following record:</p>

                  {/* DNS record table */}
                  <div className="bg-muted/40 rounded-lg border overflow-x-auto">
                    <table className="w-full text-xs font-mono min-w-[360px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-3 py-2 text-muted-foreground font-sans font-medium text-[10px] uppercase tracking-wide w-20">Type</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-sans font-medium text-[10px] uppercase tracking-wide w-28">Name / Host</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-sans font-medium text-[10px] uppercase tracking-wide">Value / Points To</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-sans font-medium text-[10px] uppercase tracking-wide w-16">TTL</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-primary/5">
                          <td className="px-3 py-2.5"><Badge variant="outline" className="text-[10px] h-4 font-mono font-semibold">CNAME</Badge></td>
                          <td className="px-3 py-2.5 font-semibold">@</td>
                          <td className="px-3 py-2.5 text-primary font-semibold">{dns.cnameTarget}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{dns.dnsTtl}</td>
                          <td className="px-3 py-2.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(dns.cnameTarget, "dns-value")}>
                              {copiedId === "dns-value" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2.5"><Badge variant="outline" className="text-[10px] h-4 font-mono font-semibold text-purple-600 border-purple-300">A</Badge></td>
                          <td className="px-3 py-2.5 font-semibold">@</td>
                          <td className="px-3 py-2.5 text-primary font-semibold">{dns.aRecordIp}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{dns.dnsTtl}</td>
                          <td className="px-3 py-2.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(dns.aRecordIp, "dns-ip")}>
                              {copiedId === "dns-ip" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-t border-dashed">
                          <td className="px-3 py-2.5 text-muted-foreground" colSpan={5}>
                            <span className="text-[10px] font-sans flex items-center gap-1.5">
                              <Info className="h-3 w-3 shrink-0" />
                              For root domain (<code>@</code> or <code>yourresort.com</code>), use an <span className="font-semibold">A record</span> pointing to your server IP, or an ALIAS/ANAME if your registrar supports it.
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Registrar-specific guides */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Step-by-step for popular registrars:</p>
                    {[
                      {
                        id: "namecheap",
                        label: "Namecheap",
                        steps: [
                          "Log in → Domain List → click Manage next to your domain",
                          "Go to the Advanced DNS tab",
                          "Click Add New Record → select CNAME Record",
                          `Set Host = "@", Value = "${dns.cnameTarget}", TTL = Automatic`,
                          "Click the green ✓ to save",
                        ],
                      },
                      {
                        id: "godaddy",
                        label: "GoDaddy",
                        steps: [
                          "Log in → My Products → click DNS next to your domain",
                          "Scroll to DNS Records → click Add",
                          "Select Type: CNAME",
                          `Set Name = "@", Value = "${dns.cnameTarget}", TTL = 1 Hour`,
                          "Click Save",
                        ],
                      },
                      {
                        id: "cloudflare",
                        label: "Cloudflare",
                        steps: [
                          "Log in → select your domain → go to DNS → Records",
                          "Click Add record",
                          "Select Type: CNAME",
                          `Set Name = "@", Target = "${dns.cnameTarget}"`,
                          "Turn OFF the Proxy (orange cloud → grey cloud), then Save",
                        ],
                        note: "Keep Proxy OFF (DNS only) for SSL to work correctly.",
                      },
                      {
                        id: "hostinger",
                        label: "Hostinger",
                        steps: [
                          "Log in → Domains → Manage → DNS / Nameservers",
                          "Go to DNS Records tab → click Add Record",
                          "Select Type: CNAME",
                          `Set Name = "@", Points to = "${dns.cnameTarget}", TTL = ${dns.dnsTtl}`,
                          "Click Save",
                        ],
                      },
                      {
                        id: "bigrock",
                        label: "BigRock / Reseller Club",
                        steps: [
                          "Log in → My Orders → List of Orders → select domain",
                          "Click DNS Management → Manage DNS",
                          "Go to CNAME Records tab → Add CNAME Record",
                          `Host = "@", Value = "${dns.cnameTarget}", TTL = ${dns.dnsTtl}`,
                          "Click Update",
                        ],
                      },
                    ].map((r) => (
                      <div key={r.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium hover:bg-muted/40 transition-colors text-left"
                          onClick={() => setExpandedRegistrar(expandedRegistrar === r.id ? null : r.id)}
                        >
                          <span className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-primary" />
                            {r.label}
                          </span>
                          {expandedRegistrar === r.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                        {expandedRegistrar === r.id && (
                          <div className="border-t bg-muted/20 px-3 py-2.5 space-y-1.5">
                            {r.note && (
                              <p className="text-[10px] text-yellow-700 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 flex items-start gap-1.5">
                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />{r.note}
                              </p>
                            )}
                            {r.steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                <span className="flex-none w-4 h-4 rounded-full bg-muted border text-[9px] font-bold flex items-center justify-center text-foreground mt-0.5">{i + 1}</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">3</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Verify your domain</p>
                  <p className="text-xs text-muted-foreground">Once records are saved, click <span className="font-semibold text-foreground">Verify DNS</span> on your domain card below. Propagation can take <span className="font-semibold text-foreground">5 min – 24 hours</span> depending on your registrar.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">SSL certificate — automatic</p>
                  <p className="text-xs text-muted-foreground">We auto-provision a free SSL certificate after verification. Your domain will be live at <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">https://</code> with no extra steps.</p>
                </div>
              </div>
            </div>

            {/* Propagation note */}
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">DNS propagation</span> is a global update that can take anywhere from a few minutes to 24 hours. Use{" "}
                <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  dnschecker.org <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                to check if your CNAME is live worldwide.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Custom Domains List */}
      <motion.div {...fade} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" /> Custom Domains ({customDomains.length})
          </h4>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={fetchData}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        {customDomains.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Unlink className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm mb-1 font-medium">No custom domains yet</p>
              <p className="text-xs mb-4">Connect your own domain like <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">booking.yourresort.com</code></p>
              <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {customDomains.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className={`transition-colors ${d.verified ? "border-green-500/20" : "border-yellow-500/20"}`}>
                    <CardContent className="p-3 sm:p-4 space-y-2.5">
                      {/* Domain name row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-semibold truncate">{d.custom_domain}</p>
                            {d.registrar && (
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                                <Zap className="h-2 w-2 mr-0.5" />
                                {d.registrar === "godaddy" ? "GoDaddy" : d.registrar === "hostinger" ? "Hostinger" : d.registrar === "entri" ? "Entri" : d.registrar}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Added {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyToClipboard(d.custom_domain, d.id)}
                        >
                          {copiedId === d.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Status row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {d.verified ? (
                          <Badge variant="default" className="text-[10px] h-5 bg-green-600">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                            <Clock className="h-2.5 w-2.5 mr-1" /> Pending Verification
                          </Badge>
                        )}
                        <SslBadge status={d.ssl_status} />
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {!d.verified && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1 sm:flex-none"
                            onClick={() => verifyDomain(d.id)}
                            disabled={verifying === d.id}
                          >
                            {verifying === d.id ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Verifying...</>
                            ) : (
                              <><Activity className="h-3 w-3 mr-1" /> Verify DNS</>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => confirmRemoveDomain(d)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>


      {/* Edit Subdomain Dialog */}
      <Dialog open={editSubdomain} onOpenChange={setEditSubdomain}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Platform Subdomain</DialogTitle>
            <DialogDescription>Your free subdomain on {dns.baseDomain}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center mt-1 gap-0">
                <Input
                  value={subdomainValue}
                  onChange={(e) => setSubdomainValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-resort"
                  className="rounded-r-none font-mono text-sm"
                />
                <div className="h-9 px-3 flex items-center bg-muted border border-l-0 rounded-r-md text-xs text-muted-foreground whitespace-nowrap">
                  {dns.subdomainSuffix}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditSubdomain(false)}>Cancel</Button>
              <Button size="sm" onClick={updateSubdomain} disabled={savingSubdomain || !subdomainValue.trim()}>
                {savingSubdomain ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) resetDialog(); else setShowAdd(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>Choose manual DNS setup or auto-configure with your registrar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Custom Domain</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="booking.myresort.com"
                className="mt-1 font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">e.g. booking.yourresort.com or www.yourresort.com</p>
            </div>

            <div className="bg-muted/40 border rounded-lg p-3 space-y-2.5">
              <p className="text-xs font-semibold flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-primary" /> What happens next</p>
              <div className="space-y-2">
                {[
                  { n: 1, text: <>Go to your domain registrar (GoDaddy, Namecheap, Cloudflare…)</> },
                  { n: 2, text: <><span className="font-semibold">Add a CNAME record:</span> Name = <code className="bg-background border rounded px-1">@</code>, Value = <code className="bg-background border rounded px-1 text-primary">{dns.cnameTarget}</code></> },
                  { n: 3, text: <>Come back and click <span className="font-semibold">Verify DNS</span> — takes 5 min to 24 hrs</> },
                  { n: 4, text: <>SSL certificate is activated automatically after verification</> },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="flex-none w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={resetDialog} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={addDomain} disabled={adding || !newDomain.trim()} className="w-full sm:w-auto">
                {adding ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Adding...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-1.5" /> Add Domain</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, id: "", domain: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{deleteConfirm.domain}</code>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeDomain} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function SslBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; icon: React.ReactNode }> = {
    active: { className: "bg-green-500/10 text-green-700 border-green-500/30", icon: <Shield className="h-2.5 w-2.5 mr-1" /> },
    pending: { className: "bg-muted text-muted-foreground", icon: <Clock className="h-2.5 w-2.5 mr-1" /> },
    verifying: { className: "bg-blue-500/10 text-blue-700 border-blue-500/30", icon: <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" /> },
    failed: { className: "bg-destructive/10 text-destructive border-destructive/30", icon: <AlertCircle className="h-2.5 w-2.5 mr-1" /> },
  };
  const s = map[status] || map.pending;
  return <Badge variant="outline" className={`text-[10px] h-5 ${s.className}`}>{s.icon}SSL {status}</Badge>;
}


export default AdminAccountDomain;
