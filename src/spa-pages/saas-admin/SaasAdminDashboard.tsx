import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Users, CreditCard, IndianRupee, CalendarCheck, Sparkles, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const SaasAdminDashboard = () => {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeSubs: 0,
    mrr: 0,
    totalBookings: 0,
    totalAiSearches: 0,
    trialTenants: 0,
  });
  const [planDist, setPlanDist] = useState<{ name: string; value: number }[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [tenantsRes, subsRes, txRes, plansRes, bookingsRes, aiRes] = await Promise.all([
      supabase.from("tenants").select("id, status, plan_id, created_at"),
      supabase.from("subscriptions").select("id, status, plan_id"),
      supabase.from("transactions").select("amount, status"),
      supabase.from("plans").select("id, plan_name"),
      supabase.from("bookings").select("id"),
      supabase.from("ai_search_logs").select("id"),
    ]);

    const tenants = tenantsRes.data || [];
    const subs = subsRes.data || [];
    const txs = txRes.data || [];
    const plans = plansRes.data || [];

    const activeSubs = subs.filter(s => s.status === "active").length;
    const trialSubs = subs.filter(s => s.status === "trial").length;
    const successTx = txs.filter(t => t.status === "success");
    const mrr = successTx.reduce((s, t) => s + (t.amount || 0), 0);

    setStats({
      totalTenants: tenants.length,
      activeSubs,
      mrr,
      totalBookings: bookingsRes.data?.length || 0,
      totalAiSearches: aiRes.data?.length || 0,
      trialTenants: trialSubs,
    });

    // Plan distribution
    const planMap: Record<string, number> = {};
    tenants.forEach(t => {
      const planName = plans.find(p => p.id === t.plan_id)?.plan_name || "No Plan";
      planMap[planName] = (planMap[planName] || 0) + 1;
    });
    setPlanDist(Object.entries(planMap).map(([name, value]) => ({ name, value })));

    // Tenant growth by month
    const monthMap: Record<string, number> = {};
    tenants.forEach(t => {
      const m = new Date(t.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
      monthMap[m] = (monthMap[m] || 0) + 1;
    });
    setTenantGrowth(Object.entries(monthMap).map(([month, count]) => ({ month, count })));

    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const statCards = [
    { label: "Total Tenants", value: stats.totalTenants, icon: Users, color: "text-primary" },
    { label: "Active Subscriptions", value: stats.activeSubs, icon: CreditCard, color: "text-emerald-500" },
    { label: "Monthly Revenue", value: format(stats.mrr), icon: IndianRupee, color: "text-primary" },
    { label: "Total Bookings", value: stats.totalBookings, icon: CalendarCheck, color: "text-amber-500" },
    { label: "AI Searches", value: stats.totalAiSearches, icon: Sparkles, color: "text-violet-500" },
    { label: "On Trial", value: stats.trialTenants, icon: TrendingUp, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">SaaS platform metrics and insights</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant Growth</CardTitle>
            <CardDescription>New tenants per month</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tenantGrowth}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
            <CardDescription>Tenants by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {planDist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={planDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {planDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaasAdminDashboard;
