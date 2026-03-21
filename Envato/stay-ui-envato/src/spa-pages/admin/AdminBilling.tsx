import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, CreditCard, Users, TrendingUp, IndianRupee, Plus, Eye, Building2, Zap } from "lucide-react";
import { format } from "date-fns";

interface Plan {
  id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  max_stays: number;
  max_rooms: number;
  max_bookings_per_month: number;
  max_ai_search: number;
  feature_flags: Record<string, boolean>;
  status: string;
}

interface Tenant {
  id: string;
  tenant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  domain: string;
  plan_id: string | null;
  status: string;
  created_at: string;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  start_date: string;
  renewal_date: string | null;
  billing_cycle: string;
  status: string;
  payment_gateway: string;
}

interface Transaction {
  id: string;
  transaction_id: string;
  tenant_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface TenantUsage {
  tenant_id: string;
  stays_created: number;
  rooms_created: number;
  bookings_this_month: number;
  ai_search_count: number;
  storage_used: number;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "active": return "default" as const;
    case "trial": return "secondary" as const;
    case "expired": case "cancelled": case "suspended": return "destructive" as const;
    default: return "outline" as const;
  }
};

const txStatusVariant = (s: string) => {
  switch (s) {
    case "success": return "default" as const;
    case "pending": return "secondary" as const;
    case "failed": return "destructive" as const;
    default: return "outline" as const;
  }
};

const limitLabel = (v: number) => v === -1 ? "Unlimited" : v.toString();

const AdminBilling = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usages, setUsages] = useState<TenantUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  // New tenant form
  const [newTenant, setNewTenant] = useState({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [plansRes, tenantsRes, subsRes, txRes, usageRes] = await Promise.all([
      supabase.from("plans").select("*").order("price"),
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("tenant_usage").select("*"),
    ]);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    if (tenantsRes.data) setTenants(tenantsRes.data as Tenant[]);
    if (subsRes.data) setSubscriptions(subsRes.data as Subscription[]);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (usageRes.data) setUsages(usageRes.data as TenantUsage[]);
    setLoading(false);
  };

  const getPlanName = (planId: string | null) => plans.find(p => p.id === planId)?.plan_name ?? "—";
  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.tenant_name ?? "—";
  const getUsage = (tenantId: string) => usages.find(u => u.tenant_id === tenantId);

  const addTenant = async () => {
    if (!newTenant.tenant_name) return;
    const { error } = await supabase.from("tenants").insert({
      tenant_name: newTenant.tenant_name,
      owner_name: newTenant.owner_name,
      email: newTenant.email,
      phone: newTenant.phone,
      domain: newTenant.domain,
      plan_id: newTenant.plan_id || null,
      status: "trial",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tenant added" });
      setShowAddTenant(false);
      setNewTenant({ tenant_name: "", owner_name: "", email: "", phone: "", domain: "", plan_id: "" });
      fetchAll();
    }
  };

  const updateTenantStatus = async (id: string, status: string) => {
    await supabase.from("tenants").update({ status }).eq("id", id);
    toast({ title: `Status updated to ${status}` });
    fetchAll();
  };

  const totalRevenue = transactions.filter(t => t.status === "success").reduce((sum, t) => sum + t.amount, 0);
  const activeCount = tenants.filter(t => t.status === "active").length;
  const trialCount = tenants.filter(t => t.status === "trial").length;

  const filtered = tenants.filter(t =>
    t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Billing & Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage SaaS subscriptions, tenants, and revenue</p>
        </div>
        <Button onClick={() => setShowAddTenant(true)}><Plus className="w-4 h-4 mr-1" /> Add Tenant</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">{tenants.length}</p><p className="text-xs text-muted-foreground">Total Tenants</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Zap className="w-8 h-8 text-emerald-500" /><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Active Subscriptions</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Building2 className="w-8 h-8 text-amber-500" /><div><p className="text-2xl font-bold">{trialCount}</p><p className="text-xs text-muted-foreground">On Trial</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><IndianRupee className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Revenue</p></div></div></CardContent></Card>
      </div>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Plans</CardTitle>
          <CardDescription>Available SaaS plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map(plan => (
              <Card key={plan.id} className="border-2">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{plan.plan_name}</h3>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"}>{plan.status}</Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary">₹{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.billing_cycle}</span></p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Stays: {limitLabel(plan.max_stays)}</p>
                    <p>Rooms: {limitLabel(plan.max_rooms)}</p>
                    <p>Bookings/mo: {limitLabel(plan.max_bookings_per_month)}</p>
                    <p>AI Searches: {limitLabel(plan.max_ai_search)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {Object.entries(plan.feature_flags).filter(([, v]) => v).map(([k]) => (
                      <Badge key={k} variant="outline" className="text-[10px]">{k.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenants</CardTitle>
          <CardDescription>All registered businesses</CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search tenants..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4 max-w-sm" />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No tenants yet. Add your first tenant above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.tenant_name}</TableCell>
                      <TableCell>{t.owner_name || "—"}</TableCell>
                      <TableCell>{getPlanName(t.plan_id)}</TableCell>
                      <TableCell>
                        <Select value={t.status} onValueChange={v => updateTenantStatus(t.id, v)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {["trial", "active", "expired", "suspended", "cancelled"].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setViewTenant(t)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TX ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transaction_id}</TableCell>
                    <TableCell>{getTenantName(tx.tenant_id)}</TableCell>
                    <TableCell>₹{tx.amount.toLocaleString()}</TableCell>
                    <TableCell>{tx.payment_method || "—"}</TableCell>
                    <TableCell><Badge variant={txStatusVariant(tx.status)}>{tx.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={showAddTenant} onOpenChange={setShowAddTenant}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Business Name *</Label><Input value={newTenant.tenant_name} onChange={e => setNewTenant({ ...newTenant, tenant_name: e.target.value })} className="mt-1" /></div>
            <div><Label>Owner Name</Label><Input value={newTenant.owner_name} onChange={e => setNewTenant({ ...newTenant, owner_name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={newTenant.email} onChange={e => setNewTenant({ ...newTenant, email: e.target.value })} className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={newTenant.phone} onChange={e => setNewTenant({ ...newTenant, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Domain</Label><Input value={newTenant.domain} onChange={e => setNewTenant({ ...newTenant, domain: e.target.value })} className="mt-1" placeholder="booking.resort.com" /></div>
            <div>
              <Label>Plan</Label>
              <Select value={newTenant.plan_id} onValueChange={v => setNewTenant({ ...newTenant, plan_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.plan_name} — ₹{p.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddTenant(false)}>Cancel</Button>
              <Button onClick={addTenant}>Add Tenant</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Tenant Dialog */}
      {viewTenant && (
        <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{viewTenant.tenant_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Owner:</span> {viewTenant.owner_name || "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {viewTenant.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {viewTenant.phone || "—"}</div>
                <div><span className="text-muted-foreground">Domain:</span> {viewTenant.domain || "—"}</div>
                <div><span className="text-muted-foreground">Plan:</span> {getPlanName(viewTenant.plan_id)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(viewTenant.status)}>{viewTenant.status}</Badge></div>
              </div>

              {(() => {
                const usage = getUsage(viewTenant.id);
                const plan = plans.find(p => p.id === viewTenant.plan_id);
                if (!usage || !plan) return null;
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

              {(() => {
                const sub = subscriptions.find(s => s.tenant_id === viewTenant.id);
                if (!sub) return <p className="text-sm text-muted-foreground">No active subscription</p>;
                return (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Subscription</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Plan</span><span>{getPlanName(sub.plan_id)}</span></div>
                      <div className="flex justify-between"><span>Status</span><Badge variant={statusVariant(sub.status)}>{sub.status}</Badge></div>
                      <div className="flex justify-between"><span>Start</span><span>{sub.start_date}</span></div>
                      <div className="flex justify-between"><span>Renewal</span><span>{sub.renewal_date ?? "—"}</span></div>
                      <div className="flex justify-between"><span>Gateway</span><span>{sub.payment_gateway || "—"}</span></div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminBilling;
