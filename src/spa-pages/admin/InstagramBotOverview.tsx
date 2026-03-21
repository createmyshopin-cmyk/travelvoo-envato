import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Zap, Clock } from "lucide-react";
import { getInboundPreviewFromMeta } from "@/lib/instagram-activity-meta";

type ActivityRow = Database["public"]["Tables"]["instagram_channel_activity"]["Row"];

interface Stats {
  totalDms: number;
  leadsCapt: number;
  avgLatency: number;
  todayDms: number;
}

const DM_FEED_CAP = 50;

function startOfLocalDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfNextLocalDayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function sortDmRowsChronological(rows: ActivityRow[]): ActivityRow[] {
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function mergeDmFeed(prev: ActivityRow[], incoming: ActivityRow): ActivityRow[] {
  const map = new Map<string, ActivityRow>();
  for (const r of prev) map.set(r.id, r);
  map.set(incoming.id, incoming);
  return sortDmRowsChronological(Array.from(map.values())).slice(-DM_FEED_CAP);
}

export default function InstagramBotOverview() {
  const [stats, setStats] = useState<Stats>({ totalDms: 0, leadsCapt: 0, avgLatency: 0, todayDms: 0 });
  const [dmFeed, setDmFeed] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmFeed.length]);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadOverview = async (tid: string) => {
      const [
        { count: totalDms, error: e1 },
        { count: todayDms, error: e2 },
        { count: leadsCapt, error: e3 },
        { data: latRows, error: e4 },
        { data: dmRows, error: e5 },
      ] = await Promise.all([
        supabase
          .from("instagram_channel_activity")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tid)
          .eq("channel", "dm"),
        supabase
          .from("instagram_channel_activity")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tid)
          .eq("channel", "dm")
          .gte("created_at", startOfLocalDayISO())
          .lt("created_at", startOfNextLocalDayISO()),
        supabase
          .from("instagram_channel_activity")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tid)
          .not("lead_id", "is", null),
        supabase
          .from("instagram_channel_activity")
          .select("latency_ms")
          .eq("tenant_id", tid)
          .eq("channel", "dm")
          .not("latency_ms", "is", null)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("instagram_channel_activity")
          .select("*")
          .eq("tenant_id", tid)
          .eq("channel", "dm")
          .order("created_at", { ascending: false })
          .limit(DM_FEED_CAP),
      ]);

      if (e1 || e2 || e3 || e4 || e5) {
        console.error("[InstagramBotOverview]", e1 || e2 || e3 || e4 || e5);
      }

      const latencies = (latRows ?? []).map((r) => r.latency_ms).filter((n): n is number => n != null && n > 0);
      const avgLatency = latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

      if (cancelled) return;
      setStats({
        totalDms: totalDms ?? 0,
        todayDms: todayDms ?? 0,
        leadsCapt: leadsCapt ?? 0,
        avgLatency,
      });
      const chronological = sortDmRowsChronological((dmRows ?? []) as ActivityRow[]);
      setDmFeed(chronological);
    };

    const scheduleReload = (tid: string) => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        reloadTimer.current = null;
        void loadOverview(tid);
      }, 350);
    };

    (async () => {
      const { data: tid } = await supabase.rpc("get_my_tenant_id");
      if (!tid) {
        setLoading(false);
        return;
      }

      await loadOverview(tid);
      if (cancelled) return;
      setLoading(false);

      realtimeChannel = supabase
        .channel(`ig-activity-overview-${tid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "instagram_channel_activity",
            filter: `tenant_id=eq.${tid}`,
          },
          (payload) => {
            const row = payload.new as ActivityRow;
            if (row.channel === "dm") {
              setDmFeed((prev) => mergeDmFeed(prev, row));
            }
            scheduleReload(tid);
          },
        )
        .subscribe();

      poll = setInterval(() => {
        void loadOverview(tid);
      }, 20000);
    })();

    return () => {
      cancelled = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (poll) clearInterval(poll);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
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
          <CardTitle className="text-base">Live DM preview</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Inbound text appears after each message is processed. Updates in real time when new activity is saved.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : dmFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No DMs yet. Connect your Instagram account and start receiving messages.
            </p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[28rem] overflow-y-auto rounded-lg border bg-muted/30 p-3">
              {dmFeed.map((a) => {
                const preview = getInboundPreviewFromMeta(a.meta);
                return (
                  <div key={a.id} className="flex justify-start">
                    <div className="max-w-[min(100%,28rem)] rounded-2xl rounded-tl-md bg-background border px-3 py-2 shadow-sm">
                      {preview ? (
                        <p className="text-sm whitespace-pre-wrap break-words">{preview}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No message preview stored</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                          {a.event_type?.replace(/_/g, " ") ?? "dm"}
                        </span>
                        {a.sender_ig_id && <span title={a.sender_ig_id}>IG {a.sender_ig_id}</span>}
                        {a.lead_id && (
                          <span className="text-green-600 font-semibold">LEAD</span>
                        )}
                        <span className="ml-auto shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
