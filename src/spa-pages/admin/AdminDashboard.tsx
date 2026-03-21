import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DoorOpen, CalendarCheck, IndianRupee, Store, Lock, Instagram } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Stats {
  totalStays: number;
  totalRooms: number;
  totalBookings: number;
  estimatedRevenue: number;
}

const COLORS = ["hsl(358, 82%, 55%)", "hsl(174, 100%, 33%)", "hsl(25, 95%, 53%)", "hsl(270, 60%, 50%)", "hsl(142, 71%, 45%)", "hsl(45, 100%, 51%)"];

export default function AdminDashboard() {
  const router = useRouter();
  const { format } = useCurrency();
  const { plan, loading: planLoading } = useSubscriptionGuard();
  const marketplaceEnabled = !!(plan?.feature_flags as Record<string, boolean> | undefined)?.marketplace;
  const [stats, setStats] = useState<Stats>({ totalStays: 0, totalRooms: 0, totalBookings: 0, estimatedRevenue: 0 });
  const [mpInstallCount, setMpInstallCount] = useState<number | null>(null);
  const [igDmCount, setIgDmCount] = useState<number | null>(null);
  const [igConnected, setIgConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
      const eqTenant = (q: { eq: (c: string, v: any) => any }) => (tenantId != null ? q.eq("tenant_id", tenantId) : q);
      const [staysRes, roomsRes, bookingsRes, roomCatsRes] = await Promise.all([
        eqTenant(supabase.from("stays").select("id", { count: "exact", head: true })),
        eqTenant(supabase.from("room_categories").select("id", { count: "exact", head: true })),
        eqTenant(supabase.from("bookings").select("total_price, created_at, rooms, status")),
        eqTenant(supabase.from("room_categories").select("name, stay_id")),
      ]);

      const bookings = bookingsRes.data || [];
      const totalBookings = bookings.length;
      const estimatedRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({
        totalStays: staysRes.count ?? 0,
        totalRooms: roomsRes.count ?? 0,
        totalBookings,
        estimatedRevenue,
      });

      // Monthly bookings chart (last 6 months)
      const months: Record<string, { name: string; bookings: number; revenue: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const name = d.toLocaleString("default", { month: "short" });
        months[key] = { name, bookings: 0, revenue: 0 };
      }
      bookings.forEach((b) => {
        if (!b.created_at) return;
        const d = new Date(b.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (months[key]) {
          months[key].bookings += 1;
          months[key].revenue += b.total_price || 0;
        }
      });
      setMonthlyData(Object.values(months));

      // Room popularity from bookings
      const roomCounts: Record<string, number> = {};
      bookings.forEach((b) => {
        if (Array.isArray(b.rooms)) {
          b.rooms.forEach((r: any) => {
            const name = r.name || "Unknown";
            roomCounts[name] = (roomCounts[name] || 0) + (r.count || 1);
          });
        }
      });

      // If no booking room data, use room_categories as fallback
      if (Object.keys(roomCounts).length === 0 && roomCatsRes.data) {
        roomCatsRes.data.forEach((rc) => {
          roomCounts[rc.name] = (roomCounts[rc.name] || 0) + 1;
        });
      }

      setRoomData(
        Object.entries(roomCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      if (tenantId) {
        const { count } = await supabase
          .from("tenant_marketplace_installs")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "installed");
        setMpInstallCount(count ?? 0);

        // Instagram Bot stats
        const { data: igConn } = await supabase
          .from("tenant_instagram_connections" as any)
          .select("id")
          .eq("tenant_id", tenantId)
          .maybeSingle();
        setIgConnected(!!igConn);

        const { count: dmCount } = await supabase
          .from("instagram_channel_activity" as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("channel", "dm");
        setIgDmCount(dmCount ?? 0);
      } else {
        setMpInstallCount(null);
      }

      setLoading(false);
    };
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Stays", value: stats.totalStays, icon: Building2, color: "text-primary" },
    { label: "Total Rooms", value: stats.totalRooms, icon: DoorOpen, color: "text-secondary" },
    { label: "Total Bookings", value: stats.totalBookings, icon: CalendarCheck, color: "text-primary" },
    { label: "Revenue", value: format(stats.estimatedRevenue), icon: IndianRupee, color: "text-secondary" },
  ];

  const chartConfig = {
    bookings: { label: "Bookings", color: "hsl(358, 82%, 55%)" },
    revenue: { label: "Revenue", color: "hsl(174, 100%, 33%)" },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {marketplaceEnabled && mpInstallCount !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Marketplace
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/marketplace")}>
              Browse
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{mpInstallCount}</span> installed item
              {mpInstallCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      )}

      {igDmCount !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" />
              Instagram Bot
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/instagram-bot")}>
              Open
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <span className="font-semibold text-foreground">{igDmCount}</span>
                <span className="text-sm text-muted-foreground ml-1">DMs processed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${igConnected ? "bg-green-500" : "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{igConnected ? "Connected" : "Not connected"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : monthlyData.every((d) => d.bookings === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No booking data yet. Bookings will appear here as they come in.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : roomData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No room data available.
              </div>
            ) : (
              <div className="h-48 flex items-center">
                <ChartContainer config={chartConfig} className="h-48 w-1/2">
                  <PieChart>
                    <Pie data={roomData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {roomData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="w-1/2 space-y-1">
                  {roomData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="ml-auto font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="marketplace" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !marketplaceEnabled ? (
                <div className="space-y-4 text-center py-4">
                  <div className="flex justify-center">
                    <Lock className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Marketplace is not included in your current plan. Upgrade to unlock this area.
                  </p>
                  <Button onClick={() => router.push("/admin/account/billing")}>View plans</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Browse themes and plugins, install free items, and activate a landing theme for your public site.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => router.push("/admin/marketplace")}>
                    Open Marketplace
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
