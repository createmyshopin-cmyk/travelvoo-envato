import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, CreditCard } from "lucide-react";

interface Sub { id: string; tenant_id: string; plan_id: string; start_date: string; renewal_date: string | null; billing_cycle: string; status: string; payment_gateway: string; }
interface Tenant { id: string; tenant_name: string; }
interface Plan { id: string; plan_name: string; }

const statusVariant = (s: string) => {
  switch (s) { case "active": return "default" as const; case "trial": return "secondary" as const; default: return "destructive" as const; }
};

const SaasAdminSubscriptions = () => {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    const [s, t, p] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, tenant_name"),
      supabase.from("plans").select("id, plan_name"),
    ]);
    if (s.error) setError(s.error.message);
    else if (s.data) setSubs(s.data as Sub[]);
    if (t.data) setTenants(t.data as Tenant[]);
    if (p.data) setPlans(p.data as Plan[]);
    setLoading(false);
  };

  const getName = (id: string) => tenants.find(t => t.id === id)?.tenant_name ?? "—";
  const getPlan = (id: string) => plans.find(p => p.id === id)?.plan_name ?? "—";

  const updateStatus = async (id: string, tenantId: string, status: string) => {
    await supabase.from("subscriptions").update({ status }).eq("id", id);
    await supabase.from("tenants").update({ status }).eq("id", tenantId);
    toast({ title: `Subscription → ${status}` });
    fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">All tenant subscriptions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {subs.length === 0 && !error ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No subscriptions yet. Run the migration to seed subscriptions for existing tenants.</CardContent></Card>
      ) : subs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{getName(s.tenant_id)}</TableCell>
                      <TableCell>{getPlan(s.plan_id)}</TableCell>
                      <TableCell className="text-xs">{s.start_date}</TableCell>
                      <TableCell className="text-xs">{s.renewal_date ?? "—"}</TableCell>
                      <TableCell>{s.billing_cycle}</TableCell>
                      <TableCell>{s.payment_gateway || "—"}</TableCell>
                      <TableCell>
                        <Select value={s.status} onValueChange={v => updateStatus(s.id, s.tenant_id, v)}>
                          <SelectTrigger className="w-[120px] h-8"><Badge variant={statusVariant(s.status)}>{s.status}</Badge></SelectTrigger>
                          <SelectContent>
                            {["trial", "active", "expired", "cancelled"].map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default SaasAdminSubscriptions;
