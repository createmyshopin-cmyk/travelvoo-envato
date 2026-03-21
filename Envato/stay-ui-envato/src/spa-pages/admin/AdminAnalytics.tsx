import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  ResponsiveContainer, CartesianGrid, Legend, Tooltip,
} from "recharts";
import {
  TrendingUp, TrendingDown, IndianRupee, CalendarCheck,
  Star, Users, Sparkles, Tag, BarChart3, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Colours ────────────────────────────────────────────────────────────────

const C = {
  primary:   "hsl(358, 82%, 55%)",
  teal:      "hsl(174, 100%, 33%)",
  orange:    "hsl(25, 95%, 53%)",
  purple:    "hsl(270, 60%, 50%)",
  green:     "hsl(142, 71%, 45%)",
  yellow:    "hsl(45, 100%, 51%)",
  blue:      "hsl(214, 84%, 56%)",
  pink:      "hsl(330, 81%, 60%)",
};
const PALETTE = Object.values(C);

// ─── Types ───────────────────────────────────────────────────────────────────

type Range = "30d" | "90d" | "6m" | "1y";

interface KPI {
  label: string;
  value: string;
  raw: number;
  prev: number;
  icon: any;
  color: string;
  prefix?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("en-IN");
const fmtCur = (n: number) => "₹" + fmt(n);
const pct = (curr: number, prev: number) =>
  prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

function rangeStart(r: Range): Date {
  const d = new Date();
  if (r === "30d") d.setDate(d.getDate() - 30);
  else if (r === "90d") d.setDate(d.getDate() - 90);
  else if (r === "6m") d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

function bucketLabel(date: Date, r: Range) {
  if (r === "30d") return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (r === "90d") return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

function buildTimeSeries(bookings: any[], r: Range) {
  const start = rangeStart(r);
  const buckets: Record<string, { label: string; bookings: number; revenue: number }> = {};

  const steps = r === "30d" ? 30 : r === "90d" ? 90 : r === "6m" ? 6 : 12;
  const unit: "day" | "month" = r === "30d" || r === "90d" ? "day" : "month";

  for (let i = steps - 1; i >= 0; i--) {
    const d = new Date();
    if (unit === "day") d.setDate(d.getDate() - i);
    else d.setMonth(d.getMonth() - i);
    const key = unit === "day"
      ? d.toISOString().slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { label: bucketLabel(d, r), bookings: 0, revenue: 0 };
  }

  bookings.forEach((b) => {
    if (!b.created_at) return;
    const d = new Date(b.created_at);
    if (d < start) return;
    const key = unit === "day"
      ? d.toISOString().slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[key]) {
      buckets[key].bookings += 1;
      buckets[key].revenue += b.total_price || 0;
    }
  });

  return Object.values(buckets);
}

// ─── Animated KPI Card ───────────────────────────────────────────────────────

function KpiCard({ kpi, loading }: { kpi: KPI; loading: boolean }) {
  const change = pct(kpi.raw, kpi.prev);
  const up = change !== null && change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-bl-[80px] opacity-10"
          style={{ backgroundColor: kpi.color }}
        />
        <CardHeader className="flex flex-row items-center justify-between pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: kpi.color + "22" }}>
            <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {loading ? <span className="text-muted-foreground">...</span> : kpi.value}
          </div>
          {!loading && change !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${up ? "text-green-600" : "text-destructive"}`}>
              {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(change)}% vs prev period
            </div>
          )}
          {!loading && change === null && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Minus className="w-3 h-3" /> No prior data
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }) {
  return (
    <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="w-8 h-8 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);

  // raw data
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [stays, setStays] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [bRes, rRes, aRes, cRes, sRes] = await Promise.all([
        supabase.from("bookings").select("id, total_price, status, created_at, checkin, checkout, adults, children, solo_traveller, group_booking, coupon_code, rooms"),
        supabase.from("reviews").select("rating, status, created_at"),
        supabase.from("ai_search_logs").select("query, results_count, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("coupons").select("code, usage_count, type, value, active"),
        supabase.from("stays").select("id, name, rating, reviews_count, status"),
      ]);
      setBookings(bRes.data || []);
      setReviews(rRes.data || []);
      setAiLogs(aRes.data || []);
      setCoupons(cRes.data || []);
      setStays(sRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const start = rangeStart(range);
  const prevStart = new Date(start);
  const diff = Date.now() - start.getTime();
  prevStart.setTime(start.getTime() - diff);

  const inRange = (b: any) => b.created_at && new Date(b.created_at) >= start;
  const inPrev  = (b: any) => b.created_at && new Date(b.created_at) >= prevStart && new Date(b.created_at) < start;

  const curBookings = bookings.filter(inRange);
  const prevBookings = bookings.filter(inPrev);

  const curRevenue  = curBookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const prevRevenue = prevBookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const curAvg  = curBookings.length ? Math.round(curRevenue / curBookings.length) : 0;
  const prevAvg = prevBookings.length ? Math.round(prevRevenue / prevBookings.length) : 0;
  const curRating = reviews.filter(r => r.status === "approved").length
    ? +(reviews.filter(r => r.status === "approved").reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.status === "approved").length).toFixed(1)
    : 0;

  const kpis: KPI[] = [
    { label: "Revenue", value: fmtCur(curRevenue), raw: curRevenue, prev: prevRevenue, icon: IndianRupee, color: C.primary, prefix: "₹" },
    { label: "Bookings", value: fmt(curBookings.length), raw: curBookings.length, prev: prevBookings.length, icon: CalendarCheck, color: C.teal },
    { label: "Avg Booking Value", value: fmtCur(curAvg), raw: curAvg, prev: prevAvg, icon: TrendingUp, color: C.orange },
    { label: "Avg Rating", value: curRating ? curRating + " / 5" : "—", raw: curRating, prev: 0, icon: Star, color: C.yellow },
  ];

  // Time series
  const timeSeries = buildTimeSeries(bookings, range);

  // Booking status
  const statusMap: Record<string, number> = {};
  curBookings.forEach((b) => { statusMap[b.status || "unknown"] = (statusMap[b.status || "unknown"] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Guest type
  const guestTypes = [
    { name: "Solo", value: curBookings.filter(b => b.solo_traveller).length },
    { name: "Couple", value: curBookings.filter(b => !b.solo_traveller && !b.group_booking && (b.adults || 1) <= 2).length },
    { name: "Family", value: curBookings.filter(b => !b.solo_traveller && !b.group_booking && (b.children || 0) > 0).length },
    { name: "Group", value: curBookings.filter(b => b.group_booking).length },
  ].filter(g => g.value > 0);

  // Day of week
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowMap: Record<string, number> = {};
  days.forEach(d => { dowMap[d] = 0; });
  curBookings.forEach((b) => {
    if (b.created_at) {
      const d = days[new Date(b.created_at).getDay()];
      dowMap[d] = (dowMap[d] || 0) + 1;
    }
  });
  const dowData = days.map(name => ({ name, bookings: dowMap[name] }));

  // Room type breakdown
  const roomMap: Record<string, number> = {};
  curBookings.forEach((b) => {
    if (Array.isArray(b.rooms)) {
      b.rooms.forEach((r: any) => {
        const n = r.name || "Other";
        roomMap[n] = (roomMap[n] || 0) + (r.count || 1);
      });
    }
  });
  const roomData = Object.entries(roomMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Rating distribution
  const ratingsMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.filter(r => r.status === "approved").forEach(r => { ratingsMap[r.rating] = (ratingsMap[r.rating] || 0) + 1; });
  const ratingData = [5, 4, 3, 2, 1].map(s => ({ name: `${s}★`, value: ratingsMap[s] }));

  // Top stays by bookings
  const stayBookings: Record<string, { name: string; count: number; revenue: number }> = {};
  curBookings.forEach((b) => {
    const key = b.stay_id || "unknown";
    if (!stayBookings[key]) {
      const s = stays.find(s => s.id === key);
      stayBookings[key] = { name: s?.name || "Unknown Stay", count: 0, revenue: 0 };
    }
    stayBookings[key].count += 1;
    stayBookings[key].revenue += b.total_price || 0;
  });
  const topStays = Object.values(stayBookings).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Coupons
  const topCoupons = [...coupons].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 8);

  // AI searches
  const aiInRange = aiLogs.filter(l => l.created_at && new Date(l.created_at) >= start);
  const queryMap: Record<string, number> = {};
  aiInRange.forEach(l => { if (l.query) queryMap[l.query.toLowerCase()] = (queryMap[l.query.toLowerCase()] || 0) + 1; });
  const topQueries = Object.entries(queryMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Checkin lead-time buckets
  const leadData = [
    { name: "Same day", value: 0 },
    { name: "1–3 days", value: 0 },
    { name: "4–7 days", value: 0 },
    { name: "1–2 weeks", value: 0 },
    { name: "2–4 weeks", value: 0 },
    { name: "1+ month", value: 0 },
  ];
  curBookings.forEach((b) => {
    if (!b.created_at || !b.checkin) return;
    const diff = Math.floor((new Date(b.checkin).getTime() - new Date(b.created_at).getTime()) / 86400000);
    if (diff <= 0) leadData[0].value++;
    else if (diff <= 3) leadData[1].value++;
    else if (diff <= 7) leadData[2].value++;
    else if (diff <= 14) leadData[3].value++;
    else if (diff <= 28) leadData[4].value++;
    else leadData[5].value++;
  });

  const RANGES: { label: string; value: Range }[] = [
    { label: "30 Days", value: "30d" },
    { label: "90 Days", value: "90d" },
    { label: "6 Months", value: "6m" },
    { label: "1 Year", value: "1y" },
  ];

  const chartCfg = {
    bookings: { label: "Bookings", color: C.primary },
    revenue:  { label: "Revenue",  color: C.teal },
  };

  const hasTimeSeries = timeSeries.some(d => d.bookings > 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance overview for your property</p>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                range === r.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} loading={loading} />)}
      </div>

      {/* Revenue + Bookings over time */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue & Bookings Trend</CardTitle>
            <CardDescription>Over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : !hasTimeSeries ? (
              <Empty label="No bookings in this period yet" />
            ) : (
              <ChartContainer config={chartCfg} className="h-56 w-full">
                <AreaChart data={timeSeries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBook" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    interval={range === "30d" ? 4 : range === "90d" ? 9 : 0}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area yAxisId="left" type="monotone" dataKey="bookings" stroke={C.primary} fill="url(#gradBook)" strokeWidth={2} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" stroke={C.teal} fill="url(#gradRev)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Status</CardTitle>
            <CardDescription>{curBookings.length} total bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : statusData.length === 0 ? (
              <Empty label="No bookings yet" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ChartContainer config={chartCfg} className="h-36 w-full">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ChartContainer>
                <div className="w-full space-y-1.5">
                  {statusData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className="capitalize text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top Stays */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Stays by Revenue</CardTitle>
            <CardDescription>In selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : topStays.length === 0 ? (
              <Empty label="No data available" />
            ) : (
              <div className="space-y-3">
                {topStays.map((s, i) => {
                  const maxRev = topStays[0].revenue || 1;
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: PALETTE[i % PALETTE.length] }}>
                            {i + 1}
                          </span>
                          <span className="font-medium truncate max-w-[160px]">{s.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-xs text-primary">₹{fmt(s.revenue)}</p>
                          <p className="text-[10px] text-muted-foreground">{s.count} bookings</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.revenue / maxRev) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Day of Week</CardTitle>
            <CardDescription>When guests book the most</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : dowData.every(d => d.bookings === 0) ? (
              <Empty label="No booking data yet" />
            ) : (
              <ChartContainer config={chartCfg} className="h-48 w-full">
                <BarChart data={dowData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
                    {dowData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Guest Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest Type Mix</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : guestTypes.length === 0 ? (
              <Empty label="No guest data" />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ChartContainer config={chartCfg} className="h-32 w-full">
                  <PieChart>
                    <Pie data={guestTypes} dataKey="value" cx="50%" cy="50%" outerRadius={55} paddingAngle={4}>
                      {guestTypes.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {guestTypes.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                      <span className="text-muted-foreground">{g.name}</span>
                      <span className="ml-auto font-semibold">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Lead Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Lead Time</CardTitle>
            <CardDescription>How far in advance guests book</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : leadData.every(d => d.value === 0) ? (
              <Empty label="No data available" />
            ) : (
              <ChartContainer config={chartCfg} className="h-44 w-full">
                <BarChart data={leadData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={68} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {leadData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Room Mix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room Category Mix</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : roomData.length === 0 ? (
              <Empty label="No room data" />
            ) : (
              <div className="space-y-2">
                {roomData.map((r, i) => {
                  const max = roomData[0].value || 1;
                  return (
                    <div key={r.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate text-muted-foreground">{r.name}</span>
                        <span className="font-medium ml-2">{r.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.value / max) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5 */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" /> Review Ratings
            </CardTitle>
            <CardDescription>{reviews.filter(r => r.status === "approved").length} approved reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : reviews.length === 0 ? (
              <Empty label="No reviews yet" />
            ) : (
              <div className="space-y-2.5">
                {ratingData.map((r, i) => {
                  const max = Math.max(...ratingData.map(x => x.value), 1);
                  const starColors = ["", C.green, C.teal, C.yellow, C.orange, C.primary];
                  return (
                    <div key={r.name} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-semibold text-muted-foreground shrink-0">{r.name}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.value / max) * 100}%` }}
                          transition={{ duration: 0.7, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: starColors[5 - i] }}
                        />
                      </div>
                      <span className="w-6 text-xs font-bold text-right">{r.value}</span>
                    </div>
                  );
                })}
                <div className="pt-2 border-t mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Rating</span>
                    <div className="flex items-center gap-1 font-bold">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      {curRating || "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupon Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Coupon Performance
            </CardTitle>
            <CardDescription>Most used discount codes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : coupons.length === 0 ? (
              <Empty label="No coupons created yet" />
            ) : (
              <div className="space-y-2">
                {topCoupons.map((c, i) => (
                  <div key={c.code} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold truncate">{c.code}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`} · {c.active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{c.usage_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground">uses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI Search Insights
          </CardTitle>
          <CardDescription>Top queries from guests in this period · {aiInRange.length} total searches</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : topQueries.length === 0 ? (
            <Empty label="No AI search logs in this period" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {topQueries.map(([query, count], i) => (
                <motion.div
                  key={query}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
                  style={{ borderColor: PALETTE[i % PALETTE.length] + "55", backgroundColor: PALETTE[i % PALETTE.length] + "11" }}
                >
                  <span className="text-foreground/80 truncate max-w-[200px]">{query}</span>
                  <Badge
                    className="text-[10px] h-4 px-1.5 text-white border-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                  >
                    {count}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
