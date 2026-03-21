import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, MessageCircle, Users, TrendingUp } from "lucide-react";

interface ChannelStats {
  channel: string;
  total: number;
  leads: number;
}

export default function InstagramBotAnalytics() {
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();

    const channel = supabase
      .channel("ig-analytics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "instagram_channel_activity" }, (payload) => {
        setRecentActivity((prev) => [payload.new as any, ...prev].slice(0, 100));
        const row = payload.new as any;
        setChannelStats((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((c) => c.channel === row.channel);
          if (idx >= 0) {
            copy[idx] = { ...copy[idx], total: copy[idx].total + 1, leads: row.lead_id ? copy[idx].leads + 1 : copy[idx].leads };
          } else {
            copy.push({ channel: row.channel, total: 1, leads: row.lead_id ? 1 : 0 });
          }
          return copy;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    if (!tid) { setLoading(false); return; }

    const days = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await supabase
      .from("instagram_channel_activity" as any)
      .select("*")
      .eq("tenant_id", tid)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (data ?? []) as any[];
    setRecentActivity(rows.slice(0, 100));

    const statsMap: Record<string, ChannelStats> = {};
    for (const r of rows) {
      const ch = r.channel || "dm";
      if (!statsMap[ch]) statsMap[ch] = { channel: ch, total: 0, leads: 0 };
      statsMap[ch].total++;
      if (r.lead_id) statsMap[ch].leads++;
    }
    setChannelStats(Object.values(statsMap));
    setLoading(false);
  };

  const totalEvents = channelStats.reduce((a, c) => a + c.total, 0);
  const totalLeads = channelStats.reduce((a, c) => a + c.leads, 0);
  const convRate = totalEvents > 0 ? ((totalLeads / totalEvents) * 100).toFixed(1) : "0";

  const channelIcon = (ch: string) => {
    if (ch === "comment") return MessageCircle;
    return MessageSquare;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Instagram Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Captured</CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${convRate}%`}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">By Channel</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : channelStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in this range.</p>
            ) : (
              <div className="space-y-3">
                {channelStats.map((cs) => {
                  const Icon = channelIcon(cs.channel);
                  return (
                    <div key={cs.channel} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize text-sm">{cs.channel}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">{cs.total}</span>
                        <span className="text-muted-foreground ml-2">{cs.leads} leads</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentActivity.slice(0, 20).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                    <div>
                      <span className="font-medium capitalize">{a.channel}</span>
                      <span className="text-muted-foreground mx-2">{a.event_type?.replace(/_/g, " ")}</span>
                      {a.lead_id && <span className="text-green-600 text-xs font-medium">LEAD</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
