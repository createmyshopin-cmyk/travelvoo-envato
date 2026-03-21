import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Eye, Building2, CreditCard, RotateCcw, ShieldOff, CalendarPlus, Globe, Zap, Check, X, Lock, Trash2, ShieldCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { initiateRazorpayCheckout } from "@/lib/razorpay";
import { format } from "date-fns";

interface Plan { id: string; plan_name: string; price: number; max_stays: number; max_rooms: number; max_bookings_per_month: number; max_ai_search: number; }
interface Tenant { id: string; tenant_name: string; owner_name: string; email: string; phone: string; domain: string; plan_id: string | null; status: string; created_at: string; user_id?: string | null; }
interface TenantUsage { tenant_id: string; stays_created: number; rooms_created: number; bookings_this_month: number; ai_search_count: number; storage_used: number; }
interface Subscription { id: string; tenant_id: string; status: string; renewal_date: string | null; plan_id: string | null; }

const statusVariant = (s: string) => {
  switch (s) { case "active": return "default" as const; case "trial": return "secondary" as const; case "expired": case "cancelled": case "suspended": return "destructive" as const; default: return "outline" as const; }
};

const limitLabel = (v: number) => v === -1 ? "Unlimited" : v.toString();

const slugifySubdomain = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

const PAGE_SIZE = 25;

const SaasAdminTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usages, setUsages] = useState<TenantUsage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTenantId, setDeleteTenantId] = useState<string | null>(null);
  const [form, setForm] = useState({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "", password: "", confirmPassword: "" });
  const [subdomainSuffix, setSubdomainSuffix] = useState(".travelvoo.in");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [autoVerifyNewSignup, setAutoVerifyNewSignup] = useState(false);
  const [autoVerifySaving, setAutoVerifySaving] = useState(false);
  const checkingSlugRef = useRef<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    supabase.from("saas_platform_settings").select("setting_value").eq("setting_key", "signup_auto_verify").maybeSingle().then(({ data }) => {
      setAutoVerifyNewSignup(data?.setting_value === "true");
    });
  }, []);

  // Reset form and subdomain state when Add dialog closes
  useEffect(() => {
    if (!showAdd) {
      setForm({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "", password: "", confirmPassword: "" });
      setSubdomainStatus("idle");
      checkingSlugRef.current = null;
    }
  }, [showAdd]);

  // Fetch subdomain suffix when Add dialog opens
  useEffect(() => {
    if (!showAdd) return;
    supabase.from("saas_platform_settings").select("setting_value").eq("setting_key", "platform_subdomain_suffix").maybeSingle().then(({ data }) => {
      if (data?.setting_value) setSubdomainSuffix(data.setting_value);
    });
  }, [showAdd]);

  // Real-time subdomain availability check (debounced, with race-condition guard)
  useEffect(() => {
    const slug = slugifySubdomain(form.domain);
    if (!slug || slug.length < 2) {
      setSubdomainStatus("idle");
      checkingSlugRef.current = null;
      return;
    }
    setSubdomainStatus("checking");
    checkingSlugRef.current = slug;
    const t = setTimeout(async () => {
      const slugAtCheck = slug;
      const { data } = await supabase.from("tenant_domains").select("id").eq("subdomain", slugAtCheck).maybeSingle();
      if (checkingSlugRef.current === slugAtCheck) {
        setSubdomainStatus(data ? "taken" : "available");
        checkingSlugRef.current = null;
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.domain]);

  const fetchAll = async () => {
    setLoading(true);
    const [t, p, u, s] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("price"),
      supabase.from("tenant_usage").select("*"),
      supabase.from("subscriptions").select("id, tenant_id, status, renewal_date, plan_id").order("created_at", { ascending: false }),
    ]);
    if (t.data) setTenants(t.data as Tenant[]);
    if (p.data) setPlans(p.data as Plan[]);
    if (u.data) setUsages(u.data as TenantUsage[]);
    if (s.data) setSubscriptions(s.data as Subscription[]);
    setLoading(false);
  };

  const getPlan = (id: string | null) => plans.find(p => p.id === id);
  const getUsage = (id: string) => usages.find(u => u.tenant_id === id);
  // Latest subscription per tenant
  const getSub = (tenantId: string) => subscriptions.find(s => s.tenant_id === tenantId);

  const setAutoVerify = async (enabled: boolean) => {
    setAutoVerifySaving(true);
    try {
      const { data: existing } = await supabase.from("saas_platform_settings").select("id").eq("setting_key", "signup_auto_verify").maybeSingle();
      if (existing) {
        await supabase.from("saas_platform_settings").update({ setting_value: String(enabled) } as any).eq("setting_key", "signup_auto_verify");
      } else {
        await supabase.from("saas_platform_settings").insert({ setting_key: "signup_auto_verify", setting_value: String(enabled) } as any);
      }
      setAutoVerifyNewSignup(enabled);
      toast({ title: enabled ? "Auto-verify on" : "Auto-verify off", description: enabled ? "New signups will have subdomain verified instantly" : "New signups require manual verification" });
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    }
    setAutoVerifySaving(false);
  };

  const addTenant = async () => {
    if (!form.tenant_name) return;
    const slug = slugifySubdomain(form.domain);
    if (form.domain.trim() && !slug) {
      toast({ title: "Invalid subdomain", description: "Use only letters, numbers, and hyphens", variant: "destructive" });
      return;
    }
    if (slug && subdomainStatus === "taken") {
      toast({ title: "Subdomain taken", description: `"${slug}" is already in use`, variant: "destructive" });
      return;
    }
    if (slug && subdomainStatus === "checking") {
      toast({ title: "Please wait", description: "Checking subdomain availability...", variant: "destructive" });
      return;
    }
    const hasEmail = !!form.email?.trim();
    const hasPassword = !!form.password;
    if (hasEmail !== hasPassword) {
      toast({ title: "Email & Password", description: "Provide both email and password to create a login, or leave both empty.", variant: "destructive" });
      return;
    }
    if (hasPassword && form.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (hasPassword && form.password !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (hasEmail && hasPassword) {
      const { data, error } = await supabase.functions.invoke("create-tenant-admin", {
        body: {
          email: form.email.trim(),
          password: form.password,
          tenant_name: form.tenant_name.trim(),
          owner_name: form.owner_name?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          subdomain: slug || undefined,
          plan_id: form.plan_id || undefined,
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to create tenant", variant: "destructive" });
        return;
      }
      const errMsg = data?.error;
      if (errMsg) {
        toast({ title: "Error", description: errMsg, variant: "destructive" });
        return;
      }
      toast({ title: "Tenant created", description: "Admin can log in with the email and password you provided." });
      setShowAdd(false);
      setForm({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "", password: "", confirmPassword: "" });
      setSubdomainStatus("idle");
      fetchAll();
      return;
    }

    const domainVal = slug || form.domain.trim() || form.tenant_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const planId = form.plan_id || plans[0]?.id || null;
    if (!planId) {
      toast({ title: "No plan", description: "Add at least one active plan first, or provide email+password to use default plan.", variant: "destructive" });
      return;
    }
    const tenantData = { tenant_name: form.tenant_name, owner_name: form.owner_name, email: form.email, phone: form.phone, domain: domainVal, plan_id: planId, status: "trial" };
    const { data: newTenant, error } = await supabase.from("tenants").insert(tenantData).select().single();
    if (error || !newTenant) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    await supabase.from("subscriptions").insert({
      tenant_id: newTenant.id,
      plan_id: planId,
      status: "trial",
      renewal_date: trialEnd.toISOString().split("T")[0],
    });

    if (slug) {
      await supabase.from("tenant_domains").insert({ tenant_id: newTenant.id, subdomain: slug });
    }

    toast({ title: "Tenant created" });
    setShowAdd(false);
    setForm({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "", password: "", confirmPassword: "" });
    setSubdomainStatus("idle");
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
      return;
    }
    // Sync subscription status for all relevant statuses
    await supabase.from("subscriptions").update({ status }).eq("tenant_id", id);
    toast({ title: `Status updated to ${status}` });
    await fetchAll();
  };

  const upgradePlan = async (tenantId: string, planId: string) => {
    await supabase.from("tenants").update({ plan_id: planId }).eq("id", tenantId);
    // Update subscription too
    const { data: sub } = await supabase.from("subscriptions").select("id").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).single();
    if (sub) {
      await supabase.from("subscriptions").update({ plan_id: planId, status: "active" }).eq("id", sub.id);
    }
    toast({ title: "Plan updated" });
    fetchAll();
  };

  const resetUsage = async (tenantId: string) => {
    await supabase.from("tenant_usage").update({
      stays_created: 0, rooms_created: 0, bookings_this_month: 0, ai_search_count: 0, storage_used: 0, last_reset: new Date().toISOString(),
    }).eq("tenant_id", tenantId);
    toast({ title: "Usage reset" });
    fetchAll();
  };

  const extendTrial = async (tenantId: string) => {
    const newRenewal = new Date();
    newRenewal.setDate(newRenewal.getDate() + 3);
    const { data: sub } = await supabase.from("subscriptions").select("id").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).single();
    if (sub) {
      await supabase.from("subscriptions").update({
        status: "trial",
        renewal_date: newRenewal.toISOString().split("T")[0],
      }).eq("id", sub.id);
    }
    await supabase.from("tenants").update({ status: "trial" }).eq("id", tenantId);
    toast({ title: "Trial extended by 3 days" });
    fetchAll();
  };

  const forceDomainVerify = async (tenantId: string) => {
    await supabase.from("tenant_domains").update({ verified: true, ssl_status: "active" }).eq("tenant_id", tenantId);
    toast({ title: "Domain force-verified" });
  };

  const grantAdminAccess = async (tenant: Tenant) => {
    if (tenant.user_id) {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: tenant.user_id, role: "admin" },
        { onConflict: "user_id,role" }
      );
      if (error) {
        toast({ title: "Failed to grant admin", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Admin access granted", description: "They can now sign in at /admin/login" });
      return;
    }
    if (!tenant.email?.trim()) {
      toast({ title: "No email", description: "Add an email to this tenant first, or create the account via Add Tenant with email+password.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("grant-tenant-admin", {
      body: { email: tenant.email.trim(), tenant_id: tenant.id },
    });
    if (error) {
      toast({ title: "Failed to grant admin", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.error) {
      toast({ title: "Failed to grant admin", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Admin access granted", description: "They can now sign in at /admin/login" });
    setViewTenant(null);
    fetchAll();
  };

  const deleteTenant = async (id: string) => {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete tenant", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tenant deleted" });
    setDeleteTenantId(null);
    setViewTenant(null);
    fetchAll();
  };

  const filtered = tenants.filter(t =>
    t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all platform tenants · {filtered.length} total</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-verify"
              checked={autoVerifyNewSignup}
              disabled={autoVerifySaving}
              onCheckedChange={(v) => setAutoVerify(v)}
            />
            <Label htmlFor="auto-verify" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              Auto-verify new signups
            </Label>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Tenant</Button>
        </div>
      </div>

      <Input placeholder="Search tenants..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No tenants found</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-28">Tenant ID</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((t, idx) => {
                    const sub = getSub(t.id);
                    const subPlan = getPlan(sub?.plan_id ?? t.plan_id);
                    const expiryDate = sub?.renewal_date ? new Date(sub.renewal_date) : null;
                    const isExpiredDate = expiryDate && expiryDate < new Date();
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground select-all" title={t.id}>{t.id.slice(0, 8)}…</TableCell>
                        <TableCell className="font-medium">{t.tenant_name}</TableCell>
                        <TableCell className="text-sm">{t.owner_name || "—"}</TableCell>
                        <TableCell className="text-xs">{t.email || "—"}</TableCell>
                        <TableCell className="text-sm">{subPlan?.plan_name || getPlan(t.plan_id)?.plan_name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-xs">
                          {expiryDate ? (
                            <span className={isExpiredDate ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {format(expiryDate, "dd MMM yyyy")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Select value={t.status} onValueChange={v => updateStatus(t.id, v)}>
                            <SelectTrigger className="w-[120px] h-8"><Badge variant={statusVariant(t.status)}>{t.status}</Badge></SelectTrigger>
                            <SelectContent>
                              {["trial", "active", "expired", "suspended", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs">{t.domain || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewTenant(t)} title="View"><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTenantId(t.id)} title="Delete tenant"><Trash2 className="w-4 h-4 shrink-0" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-8 px-0">{p}</Button>
                  ))}
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Business Name *</Label><Input value={form.tenant_name} onChange={e => setForm({ ...form, tenant_name: e.target.value })} className="mt-1" /></div>
            <div><Label>Owner Name</Label><Input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@resort.com" className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="mt-1" autoComplete="new-password" /></div>
              <div><Label>Confirm Password</Label><Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat password" className="mt-1" autoComplete="new-password" /></div>
            </div>
            {(form.email || form.password) && (
              <p className="text-xs text-muted-foreground">When both Email and Password are provided, a tenant admin account is created so they can log in immediately.</p>
            )}
            <div>
              <Label>Subdomain</Label>
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <Input
                    value={form.domain}
                    onChange={e => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setForm({ ...form, domain: v });
                    }}
                    placeholder="greenleaf"
                    className="flex-1"
                  />
                  {subdomainStatus === "checking" && <div className="flex items-center text-muted-foreground text-sm shrink-0">Checking…</div>}
                  {subdomainStatus === "available" && <div className="flex items-center text-emerald-600 text-sm shrink-0"><Check className="w-4 h-4 mr-1" /> Available</div>}
                  {subdomainStatus === "taken" && <div className="flex items-center text-destructive text-sm shrink-0"><X className="w-4 h-4 mr-1" /> Taken</div>}
                </div>
                {form.domain && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {slugifySubdomain(form.domain) || form.domain}{subdomainSuffix}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.plan_id} onValueChange={v => setForm({ ...form, plan_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.plan_name} — ₹{p.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={addTenant}
                disabled={
                  !form.tenant_name ||
                  (slugifySubdomain(form.domain).length >= 2 && (subdomainStatus === "checking" || subdomainStatus === "taken"))
                }
              >
                Add Tenant
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Tenant Detail */}
      {viewTenant && (
        <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {viewTenant.tenant_name}
              </DialogTitle>
              <DialogDescription>Manage tenant settings, plan, and usage</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Owner:</span> {viewTenant.owner_name || "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewTenant.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {viewTenant.phone || "—"}</div>
                <div><span className="text-muted-foreground">Domain:</span> {viewTenant.domain || "—"}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(viewTenant.status)}>{viewTenant.status}</Badge></div>
                <div><span className="text-muted-foreground">Created:</span> {format(new Date(viewTenant.created_at), "dd MMM yyyy")}</div>
              </div>

              {/* Upgrade Plan */}
              <div>
                <Label>Change Plan</Label>
                <Select value={viewTenant.plan_id || "no-plan"} onValueChange={v => { if (v !== "no-plan") upgradePlan(viewTenant.id, v); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-plan" disabled>Select plan</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.plan_name} — ₹{p.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Usage */}
              {(() => {
                const usage = getUsage(viewTenant.id);
                const plan = getPlan(viewTenant.plan_id);
                if (!usage || !plan) return <p className="text-sm text-muted-foreground">No usage data</p>;
                return (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Usage</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Stays</span><span>{usage.stays_created} / {limitLabel(plan.max_stays)}</span></div>
                      <div className="flex justify-between"><span>Rooms</span><span>{usage.rooms_created} / {limitLabel(plan.max_rooms)}</span></div>
                      <div className="flex justify-between"><span>Bookings (month)</span><span>{usage.bookings_this_month} / {limitLabel(plan.max_bookings_per_month)}</span></div>
                      <div className="flex justify-between"><span>AI Searches</span><span>{usage.ai_search_count} / {limitLabel(plan.max_ai_search)}</span></div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Admin Controls */}
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admin Controls</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => grantAdminAccess(viewTenant)} title="Allow this tenant to sign in at /admin/login">
                    <Lock className="w-3 h-3 mr-1" /> Grant Admin Access
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => extendTrial(viewTenant.id)}>
                    <CalendarPlus className="w-3 h-3 mr-1" /> Extend Trial
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resetUsage(viewTenant.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset Usage
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => forceDomainVerify(viewTenant.id)}>
                    <Globe className="w-3 h-3 mr-1" /> Force Verify Domain
                  </Button>
                  {viewTenant.plan_id && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const plan = getPlan(viewTenant.plan_id);
                      if (!plan) return;
                      initiateRazorpayCheckout({
                        tenantId: viewTenant.id,
                        planId: plan.id,
                        planName: plan.plan_name,
                        amount: plan.price,
                        tenantName: viewTenant.tenant_name,
                        email: viewTenant.email,
                        phone: viewTenant.phone,
                        onSuccess: (txId) => {
                          toast({ title: "Payment successful!", description: `Transaction: ${txId}` });
                          setViewTenant(null);
                          fetchAll();
                        },
                        onError: (err) => {
                          toast({ title: "Payment failed", description: err, variant: "destructive" });
                        },
                      });
                    }}>
                      <CreditCard className="w-3 h-3 mr-1" /> Pay via Razorpay
                    </Button>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {viewTenant.status !== "suspended" ? (
                    <Button variant="destructive" size="sm" onClick={() => { updateStatus(viewTenant.id, "suspended"); setViewTenant(null); }}>
                      <ShieldOff className="w-3 h-3 mr-1" /> Suspend Tenant
                    </Button>
                  ) : (
                    <Button variant="default" size="sm" onClick={() => { updateStatus(viewTenant.id, "active"); setViewTenant(null); }}>
                      <Zap className="w-3 h-3 mr-1" /> Reactivate
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setDeleteTenantId(viewTenant.id); setViewTenant(null); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete Tenant
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleteTenantId} onOpenChange={(open) => !open && setDeleteTenantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tenant and all related data (subscriptions, domains, usage). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTenantId && deleteTenant(deleteTenantId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SaasAdminTenants;
