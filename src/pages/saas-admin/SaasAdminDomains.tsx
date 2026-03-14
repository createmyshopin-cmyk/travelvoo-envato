import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Globe, Plus, Trash2, CheckCircle2, XCircle, Shield, AlertCircle, Zap, Lock, Filter } from "lucide-react";
import { format } from "date-fns";

interface Domain {
  id: string;
  tenant_id: string;
  subdomain: string;
  custom_domain: string;
  ssl_status: string;
  verified: boolean;
  created_at: string;
}

interface Tenant {
  id: string;
  tenant_name: string;
}

interface PlatformConfig {
  autoSSL: boolean;
  autoApprove: boolean;
}

const sslVariant = (s: string) => {
  switch (s) {
    case "active": return "default" as const;
    case "pending": return "secondary" as const;
    case "failed": return "destructive" as const;
    default: return "outline" as const;
  }
};


const SaasAdminDomains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sslFilter, setSslFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tenant_id: "", subdomain: "", custom_domain: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({ autoSSL: false, autoApprove: false });
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => { fetchAll(); fetchPlatformConfig(); }, []);

  const fetchPlatformConfig = async () => {
    const { data } = await supabase
      .from("saas_platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["domain_auto_ssl", "domain_auto_approve"]);
    if (data) {
      const map = Object.fromEntries((data as any[]).map((r: any) => [r.setting_key, r.setting_value]));
      setPlatformConfig({
        autoSSL: map["domain_auto_ssl"] === "true",
        autoApprove: map["domain_auto_approve"] === "true",
      });
    }
  };

  const savePlatformConfig = async (key: string, value: boolean) => {
    setConfigLoading(true);
    const { data: existing } = await supabase
      .from("saas_platform_settings")
      .select("id")
      .eq("setting_key", key)
      .single();
    if (existing) {
      await supabase.from("saas_platform_settings").update({ setting_value: String(value), updated_at: new Date().toISOString() }).eq("setting_key", key);
    } else {
      await supabase.from("saas_platform_settings").insert({ setting_key: key, setting_value: String(value) } as any);
    }
    setConfigLoading(false);
  };

  const toggleAutoSSL = async (val: boolean) => {
    setPlatformConfig(c => ({ ...c, autoSSL: val }));
    await savePlatformConfig("domain_auto_ssl", val);
    toast({ title: val ? "Auto SSL Activation enabled" : "Auto SSL Activation disabled" });
  };

  const toggleAutoApprove = async (val: boolean) => {
    setPlatformConfig(c => ({ ...c, autoApprove: val }));
    await savePlatformConfig("domain_auto_approve", val);
    toast({ title: val ? "Auto Approve Domains enabled" : "Auto Approve Domains disabled" });
  };

  const fetchAll = async () => {
    setLoading(true);
    const [d, t] = await Promise.all([
      supabase.from("tenant_domains").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, tenant_name"),
    ]);
    if (d.data) setDomains(d.data as Domain[]);
    if (t.data) setTenants(t.data as Tenant[]);
    setLoading(false);
  };

  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.tenant_name ?? "—";

  const addDomain = async () => {
    if (!form.tenant_id || (!form.subdomain && !form.custom_domain)) {
      toast({ title: "Error", description: "Select a tenant and enter at least one domain", variant: "destructive" });
      return;
    }
    const isAutoApproved = platformConfig.autoApprove;
    const { error } = await supabase.from("tenant_domains").insert({
      tenant_id: form.tenant_id,
      subdomain: form.subdomain,
      custom_domain: form.custom_domain,
      ssl_status: isAutoApproved ? "active" : "pending",
      verified: isAutoApproved,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Register custom domain with Vercel project (non-blocking)
    if (form.custom_domain) {
      supabase.functions.invoke("add-domain-to-vercel", { body: { domain: form.custom_domain } });
    }

    toast({
      title: "Domain added",
      description: isAutoApproved ? "Auto-approved with SSL active" : undefined,
    });
    setShowAdd(false);
    setForm({ tenant_id: "", subdomain: "", custom_domain: "" });
    fetchAll();
  };

  const toggleVerify = async (id: string, current: boolean) => {
    const nowVerified = !current;
    const updates: Record<string, any> = { verified: nowVerified };
    if (nowVerified && platformConfig.autoSSL) {
      updates.ssl_status = "active";
    }
    await supabase.from("tenant_domains").update(updates).eq("id", id);
    toast({
      title: current ? "Domain unverified" : "Domain verified",
      description: nowVerified && platformConfig.autoSSL ? "SSL automatically activated" : undefined,
    });
    fetchAll();
  };

  const deleteDomain = async (id: string) => {
    await supabase.from("tenant_domains").delete().eq("id", id);
    toast({ title: "Domain removed" });
    setConfirmDelete(null);
    fetchAll();
  };

  const filtered = domains.filter(d => {
    const matchSearch =
      d.subdomain.toLowerCase().includes(search.toLowerCase()) ||
      d.custom_domain.toLowerCase().includes(search.toLowerCase()) ||
      getTenantName(d.tenant_id).toLowerCase().includes(search.toLowerCase());
    const matchSSL = sslFilter === "all" || d.ssl_status === sslFilter;
    const matchType =
      typeFilter === "all" ||
      (typeFilter === "subdomain" && !!d.subdomain) ||
      (typeFilter === "custom" && !!d.custom_domain);
    return matchSearch && matchSSL && matchType;
  });

  const stats = {
    total: domains.length,
    verified: domains.filter(d => d.verified).length,
    sslActive: domains.filter(d => d.ssl_status === "active").length,
    pending: domains.filter(d => d.ssl_status === "pending").length,
    failed: domains.filter(d => d.ssl_status === "failed").length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Domain Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tenant subdomains and custom domains</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Domain</Button>
      </div>

      {/* Platform Domain Configuration */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Platform Domain Configuration
          </CardTitle>
          <CardDescription>Configure global automation settings for domain and SSL management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Auto SSL Toggle */}
            <div className="flex items-start justify-between rounded-lg border bg-background p-4 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">Auto SSL Activation</span>
                  {platformConfig.autoSSL && (
                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-4">Activated</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically sets SSL to <span className="font-mono">active</span> when a domain is verified
                </p>
              </div>
              <Switch
                checked={platformConfig.autoSSL}
                onCheckedChange={toggleAutoSSL}
                disabled={configLoading}
              />
            </div>

            {/* Auto Approve Toggle */}
            <div className="flex items-start justify-between rounded-lg border bg-background p-4 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-sm">Auto Approve Domains</span>
                  {platformConfig.autoApprove && (
                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-4">Activated</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  New domains added via this panel are instantly verified with SSL active
                </p>
              </div>
              <Switch
                checked={platformConfig.autoApprove}
                onCheckedChange={toggleAutoApprove}
                disabled={configLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Globe className="w-7 h-7 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Domains</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle2 className="w-7 h-7 text-emerald-500" /><div><p className="text-2xl font-bold">{stats.verified}</p><p className="text-xs text-muted-foreground">Verified</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Shield className="w-7 h-7 text-primary" /><div><p className="text-2xl font-bold">{stats.sslActive}</p><p className="text-xs text-muted-foreground">SSL Active</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertCircle className="w-7 h-7 text-amber-500" /><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="w-7 h-7 text-red-500" /><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search domains or tenants..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={sslFilter} onValueChange={setSslFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="SSL Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SSL</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verifying">Verifying</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Domain Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subdomain">Subdomain Only</SelectItem>
              <SelectItem value="custom">Custom Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No domains found</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Custom Domain</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Vercel</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{getTenantName(d.tenant_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{d.subdomain || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.custom_domain || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => toggleVerify(d.id, d.verified)}>
                          {d.verified
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <XCircle className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {d.ssl_status === "active" ? (
                          <Badge className="bg-emerald-500 text-white text-[10px]">
                            <Shield className="w-3 h-3 mr-1" /> active
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{d.ssl_status}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {d.custom_domain ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Vercel
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">wildcard</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(d.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Domain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {platformConfig.autoApprove && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                <Zap className="w-3.5 h-3.5" />
                Auto-approve is ON — domain will be instantly verified with SSL active
              </div>
            )}
            <div>
              <Label>Tenant *</Label>
              <Select value={form.tenant_id} onValueChange={v => setForm({ ...form, tenant_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center gap-1 mt-1">
                <Input value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })} placeholder="greenleaf" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.travelvoo.in</span>
              </div>
            </div>
            <div>
              <Label>Custom Domain</Label>
              <Input value={form.custom_domain} onChange={e => setForm({ ...form, custom_domain: e.target.value })} className="mt-1" placeholder="booking.greenleafresort.com" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={addDomain}>Add Domain</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the domain record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteDomain(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SaasAdminDomains;
