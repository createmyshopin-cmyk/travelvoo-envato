import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, TrendingUp, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const SaasAdminAIUsage = () => {
  const [loading, setLoading] = useState(true);
  const [totalSearches, setTotalSearches] = useState(0);
  const [tenantUsages, setTenantUsages] = useState<any[]>([]);
  const [topQueries, setTopQueries] = useState<{ query: string; count: number }[]>([]);
  const [tenantChart, setTenantChart] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [logs, tenants, usages] = await Promise.all([
      supabase.from("ai_search_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, tenant_name"),
      supabase.from("tenant_usage").select("*"),
    ]);

    const allLogs = logs.data || [];
    setTotalSearches(allLogs.length);

    // Top queries
    const qCounts: Record<string, number> = {};
    allLogs.forEach((l) => { qCounts[l.query] = (qCounts[l.query] || 0) + 1; });
    setTopQueries(
      Object.entries(qCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }))
    );

    // Per-tenant usage
    const tMap = new Map((tenants.data || []).map((t) => [t.id, t.tenant_name]));
    const perTenant: Record<string, number> = {};
    allLogs.forEach((l) => {
      if (l.tenant_id) perTenant[l.tenant_id] = (perTenant[l.tenant_id] || 0) + 1;
    });

    const tenantUsageList = Object.entries(perTenant).map(([tid, count]) => ({
      tenant: tMap.get(tid) || tid.slice(0, 8),
      searches: count,
      limit: (usages.data || []).find((u) => u.tenant_id === tid)?.ai_search_count || 0,
    }));
    setTenantUsages(tenantUsageList.sort((a, b) => b.searches - a.searches));
    setTenantChart(tenantUsageList.slice(0, 8));

    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Usage Monitoring</h2>
        <p className="text-muted-foreground">Track AI search usage across tenants</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold">{totalSearches}</p>
            <p className="text-xs text-muted-foreground">Total AI Searches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold">{tenantUsages.length}</p>
            <p className="text-xs text-muted-foreground">Tenants Using AI</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold">{topQueries.length > 0 ? Math.round(totalSearches / Math.max(tenantUsages.length, 1)) : 0}</p>
            <p className="text-xs text-muted-foreground">Avg Searches/Tenant</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Searches by Tenant</CardTitle></CardHeader>
          <CardContent>
            {tenantChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tenantChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="tenant" type="category" fontSize={11} width={100} />
                  <Tooltip />
                  <Bar dataKey="searches" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-10">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Queries</CardTitle></CardHeader>
          <CardContent>
            {topQueries.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-auto">
                {topQueries.map((q, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{q.query}</span>
                    </div>
                    <Badge variant="secondary">{q.count}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-muted-foreground py-10">No queries yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Per-tenant table */}
      <Card>
        <CardHeader><CardTitle>Tenant AI Usage</CardTitle></CardHeader>
        <CardContent>
          {tenantUsages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Searches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantUsages.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.tenant}</TableCell>
                    <TableCell>{t.searches}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-center text-muted-foreground py-6">No AI usage data</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasAdminAIUsage;
