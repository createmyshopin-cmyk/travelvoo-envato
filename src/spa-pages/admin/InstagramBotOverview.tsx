import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Zap, Clock } from "lucide-react";

interface Stats {
  totalDms: number;
  leadsCapt: number;
  avgLatency: number;
  todayDms: number;
}

export default function InstagramBotOverview() {
  const [stats, setStats] = useState<Stats>({ totalDms: 0, leadsCapt: 0, avgLatency: 0, todayDms: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: tid } = await supabase.rpc("get_my_tenant_id");
      if (!tid) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("instagram_channel_activity" as any)
        .select("*")
        .eq("tenant_id", tid)
        .order("created_at", { ascending: false })
        .limit(50);

      const all = (rows ?? []) as any[];
      const dms = all.filter((r) => r.channel === "dm");
      const today = new Date().toISOString().slice(0, 10);
      const todayDms = dms.filter((r) => r.created_at?.startsWith(today)).length;
      const leads = all.filter((r) => r.lead_id);
      const latencies = dms.filter((r) => r.latency_ms).map((r) => r.latency_ms);
      const avgLatency = latencies.length ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0;

      setStats({ totalDms: dms.length, leadsCapt: leads.length, avgLatency, todayDms });
      setActivity(all.slice(0, 20));
      setLoading(false);
    };
    fetch();

    // Realtime subscription
    const channel = supabase
      .channel("ig-activity-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "instagram_channel_activity" }, (payload) => {
        setActivity((prev) => [payload.new as any, ...prev].slice(0, 20));
        const row = payload.new as any;
        if (row.channel === "dm") {
          setStats((s) => ({
            ...s,
            totalDms: s.totalDms + 1,
            todayDms: s.todayDms + 1,
            leadsCapt: row.lead_id ? s.leadsCapt + 1 : s.leadsCapt,
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const kpiCards = [
    { label: "DMs Processed", value: stats.totalDms, icon: MessageSquare, color: "text-blue-500" },
    { label: "Leads Captured", value: stats.leadsCapt, icon: Users, color: "text-green-500" },
    { label: "Today's DMs", value: stats.todayDms, icon: Zap, color: "text-amber-500" },
    { label: "Avg Latency", value: `${stats.avgLatency}ms`, icon: Clock, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Instagram Bot Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Connect your Instagram account and start receiving DMs.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activity.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium capitalize">{a.channel}</span>
                    <span className="text-muted-foreground mx-2">{a.event_type?.replace(/_/g, " ")}</span>
                    {a.lead_id && <span className="text-green-600 text-xs font-medium ml-1">LEAD</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
