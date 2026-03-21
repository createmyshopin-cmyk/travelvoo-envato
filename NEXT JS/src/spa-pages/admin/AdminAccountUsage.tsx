import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Building2, DoorOpen, CalendarCheck, Sparkles } from "lucide-react";

const AdminAccountUsage = () => {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: t } = tenantId ? await supabase.from("tenants").select("*").eq("id", tenantId).single() : { data: null };
    if (t) {
      const { data: u } = await supabase.from("tenant_usage").select("*").eq("tenant_id", t.id).single();
      setUsage(u);
      if (t.plan_id) {
        const { data: p } = await supabase.from("plans").select("*").eq("id", t.plan_id).single();
        setPlan(p);
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const items = [
    { label: "Stays", icon: Building2, used: usage?.stays_created || 0, max: plan?.max_stays || 1 },
    { label: "Rooms", icon: DoorOpen, used: usage?.rooms_created || 0, max: plan?.max_rooms || 10 },
    { label: "Bookings (this month)", icon: CalendarCheck, used: usage?.bookings_this_month || 0, max: plan?.max_bookings_per_month || 50 },
    { label: "AI Searches", icon: Sparkles, used: usage?.ai_search_count || 0, max: plan?.max_ai_search || 100 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usage Dashboard</h2>
        <p className="text-muted-foreground">Monitor your resource usage against plan limits</p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const isUnlimited = item.max === -1;
          const pct = isUnlimited ? 0 : Math.min((item.used / item.max) * 100, 100);
          const isNear = !isUnlimited && pct >= 80;
          return (
            <Card key={item.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className={`text-sm font-mono ${isNear ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {item.used} / {isUnlimited ? "∞" : item.max}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress value={pct} className={`h-2 ${isNear ? "[&>div]:bg-destructive" : ""}`} />
                )}
                {isUnlimited && <p className="text-xs text-muted-foreground">Unlimited on your plan</p>}
                {isNear && <p className="text-xs text-destructive mt-1">⚠️ Nearing limit — consider upgrading</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAccountUsage;
