import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Puzzle } from "lucide-react";

interface Feature { id: string; feature_name: string; feature_key: string; description: string; status: string; }
interface Plan { id: string; plan_name: string; }
interface PlanFeature { id: string; plan_id: string; feature_key: string; enabled: boolean; }

const SaasAdminFeatures = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [f, p, pf] = await Promise.all([
      supabase.from("features").select("*").order("feature_name"),
      supabase.from("plans").select("id, plan_name").order("price"),
      supabase.from("plan_features").select("*"),
    ]);
    if (f.data) setFeatures(f.data as Feature[]);
    if (p.data) setPlans(p.data as Plan[]);
    if (pf.data) setPlanFeatures(pf.data as PlanFeature[]);
    setLoading(false);
  };

  const isEnabled = (planId: string, featureKey: string) =>
    planFeatures.find(pf => pf.plan_id === planId && pf.feature_key === featureKey)?.enabled ?? false;

  const toggleFeature = async (planId: string, featureKey: string) => {
    const existing = planFeatures.find(pf => pf.plan_id === planId && pf.feature_key === featureKey);
    if (existing) {
      await supabase.from("plan_features").update({ enabled: !existing.enabled }).eq("id", existing.id);
    } else {
      await supabase.from("plan_features").insert({ plan_id: planId, feature_key: featureKey, enabled: true });
    }
    toast({ title: "Feature updated" });
    fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Puzzle className="w-6 h-6 text-primary" /> Feature Control</h1>
        <p className="text-sm text-muted-foreground mt-1">Assign features to plans</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature × Plan Matrix</CardTitle>
          <CardDescription>Toggle features per plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {plans.map(p => <TableHead key={p.id} className="text-center">{p.plan_name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{f.feature_name}</span>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                    </TableCell>
                    {plans.map(p => (
                      <TableCell key={p.id} className="text-center">
                        <Switch
                          checked={isEnabled(p.id, f.feature_key)}
                          onCheckedChange={() => toggleFeature(p.id, f.feature_key)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasAdminFeatures;
