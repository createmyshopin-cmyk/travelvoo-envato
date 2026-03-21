import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Receipt, IndianRupee, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Tx { id: string; transaction_id: string; tenant_id: string; amount: number; currency: string; payment_method: string; status: string; payment_gateway: string; created_at: string; }
interface Tenant { id: string; tenant_name: string; }

const txVariant = (s: string) => {
  switch (s) { case "success": return "default" as const; case "pending": return "secondary" as const; case "failed": return "destructive" as const; default: return "outline" as const; }
};

const SaasAdminTransactions = () => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [t, tn] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, tenant_name"),
    ]);
    if (t.data) setTxs(t.data as Tx[]);
    if (tn.data) setTenants(tn.data as Tenant[]);
    setLoading(false);
  };

  const getName = (id: string) => tenants.find(t => t.id === id)?.tenant_name ?? "—";

  const filtered = txs.filter(t => {
    const matchSearch = t.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      getName(t.tenant_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchTenant = tenantFilter === "all" || t.tenant_id === tenantFilter;
    return matchSearch && matchStatus && matchTenant;
  });

  const totalRevenue = txs.filter(t => t.status === "success").reduce((sum, t) => sum + t.amount, 0);
  const failedCount = txs.filter(t => t.status === "failed").length;

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /> Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">Payment history across all tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><IndianRupee className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">₹{totalRevenue.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-xl font-bold">{txs.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">Failed</p><p className="text-xl font-bold">{failedCount}</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by TX ID or tenant..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tenant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.tenant_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No transactions found</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TX ID</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.transaction_id}</TableCell>
                      <TableCell className="font-medium">{getName(tx.tenant_id)}</TableCell>
                      <TableCell>₹{tx.amount.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{tx.payment_method || "—"}</TableCell>
                      <TableCell className="capitalize">{tx.payment_gateway || "—"}</TableCell>
                      <TableCell><Badge variant={txVariant(tx.status)}>{tx.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SaasAdminTransactions;
