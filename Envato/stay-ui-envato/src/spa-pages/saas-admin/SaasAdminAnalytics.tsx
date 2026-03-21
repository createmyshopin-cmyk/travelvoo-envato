import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, BarChart3, CalendarCheck, Sparkles, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const SaasAdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tenants: 0, activeSubs: 0, mrr: 0, totalBookings: 0, aiSearches: 0 });
  const [mrrTrend, setMrrTrend] = useState<any[]>([]);
  const [planDist, setPlanDist] = useState<any[]>([]);
  const [bookingTrend, setBookingTrend] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [tenants, subs, txs, plans, bookings, aiLogs] = await Promise.all([
      supabase.from("tenants").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("transactions").select("*").eq("status", "success"),
      supabase.from("plans").select("*"),
      supabase.from("bookings").select("id, created_at"),
      supabase.from("ai_search_logs").select("id"),
    ]);

    const activeSubs = (subs.data || []).filter((s) => s.status === "active" || s.status === "trial");
    const mrr = activeSubs.reduce((sum, s) => {
      const plan = (plans.data || []).find((p) => p.id === s.plan_id);
      return sum + (plan?.price || 0);
    }, 0);

    setStats({
      tenants: (tenants.data || []).length,
      activeSubs: activeSubs.length,
      mrr,
      totalBookings: (bookings.data || []).length,
      aiSearches: (aiLogs.data || []).length,
    });

    // MRR trend (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { month: format(d, "MMM yy"), start: startOfMonth(d) };
    });
    const mrrData = months.map((m) => {
      const monthSubs = (subs.data || []).filter((s) => new Date(s.start_date) <= new Date(m.start.getTime() + 30 * 86400000));
      const val = monthSubs.reduce((sum, s) => {
        const plan = (plans.data || []).find((p) => p.id === s.plan_id);
        return sum + (plan?.price || 0);
      }, 0);
      return { month: m.month, mrr: val };
    });
    setMrrTrend(mrrData);

    // Plan distribution
    const planCounts: Record<string, number> = {};
    (tenants.data || []).forEach((t) => {
      const plan = (plans.data || []).find((p) => p.id === t.plan_id);
      const name = plan?.plan_name || "No Plan";
      planCounts[name] = (planCounts[name] || 0) + 1;
    });
    setPlanDist(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

    // Booking trend
    const bookingMonths = months.map((m) => {
      const count = (bookings.data || []).filter((b) => {
        const d = new Date(b.created_at);
        return d.getMonth() === m.start.getMonth() && d.getFullYear() === m.start.getFullYear();
      }).length;
      return { month: m.month, bookings: count };
    });
    setBookingTrend(bookingMonths);

    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const statCards = [
    { label: "Total Tenants", value: stats.tenants, icon: Building2 },
    { label: "Active Subscriptions", value: stats.activeSubs, icon: CreditCard },
    { label: "Monthly Revenue", value: `₹${stats.mrr.toLocaleString()}`, icon: TrendingUp },
    { label: "Total Bookings", value: stats.totalBookings, icon: CalendarCheck },
    { label: "AI Searches", value: stats.aiSearches, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <p className="text-muted-foreground">Comprehensive platform performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <s.icon className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>MRR Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={mrrTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Plan Distribution</CardTitle></CardHeader>
          <CardContent>
            {planDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={planDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-10">No data</p>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Bookings Across Platform</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaasAdminAnalytics;
