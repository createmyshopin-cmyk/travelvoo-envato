import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, Package, Receipt, ArrowUpCircle, Check, Crown, Zap, Building2, Loader2, ArrowDownCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  max_stays: number;
  max_rooms: number;
  max_bookings_per_month: number;
  max_ai_search: number;
  feature_flags: any;
}

const limitLabel = (v: number) => (v === -1 ? "Unlimited" : v.toString());

const planIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("enterprise") || n.includes("premium")) return <Crown className="h-5 w-5" />;
  if (n.includes("pro") || n.includes("business")) return <Zap className="h-5 w-5" />;
  return <Building2 className="h-5 w-5" />;
};

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const AdminAccountBilling = () => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [scheduledPlanName, setScheduledPlanName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; plan: Plan | null; action: "upgrade" | "downgrade" }>({ open: false, plan: null, action: "upgrade" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: t } = tenantId ? await supabase.from("tenants").select("*").eq("id", tenantId).single() : { data: null };
    setTenant(t);
    if (t) {
      if (t.plan_id) {
        const { data: p } = await supabase.from("plans").select("*").eq("id", t.plan_id).single();
        setPlan(p as Plan | null);
      }
      const { data: s } = await supabase.from("subscriptions").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setSubscription(s);

      // Resolve scheduled downgrade plan name
      if (s?.scheduled_plan_id) {
        const { data: sp } = await supabase.from("plans").select("plan_name").eq("id", s.scheduled_plan_id).single();
        setScheduledPlanName(sp?.plan_name || null);
      } else {
        setScheduledPlanName(null);
      }

      const { data: tx } = await supabase.from("transactions").select("*").eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(10);
      setTransactions(tx || []);
      const { data: allPlans } = await supabase.from("plans").select("*").eq("status", "active").order("price");
      setPlans((allPlans || []) as Plan[]);
    }
    setLoading(false);
  };

  const handlePlanAction = (targetPlan: Plan) => {
    if (!plan) {
      setConfirmDialog({ open: true, plan: targetPlan, action: "upgrade" });
      return;
    }
    const action = targetPlan.price < plan.price ? "downgrade" : "upgrade";
    setConfirmDialog({ open: true, plan: targetPlan, action });
  };

  const executePlanChange = async () => {
    const targetPlan = confirmDialog.plan;
    if (!targetPlan || !tenant) return;
    setProcessing(true);

    try {
      if (confirmDialog.action === "downgrade") {
        // Schedule downgrade via edge function
        const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
          body: { tenant_id: tenant.id, plan_id: targetPlan.id, action: "downgrade" },
        });
        if (error) throw error;
        if (data?.type === "downgrade_scheduled") {
          toast({ title: "Downgrade Scheduled", description: data.message });
          setConfirmDialog({ open: false, plan: null, action: "upgrade" });
          await fetchAll();
          return;
        }
      }

      // Upgrade flow: create order with proration
      const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
        body: { tenant_id: tenant.id, plan_id: targetPlan.id, action: "upgrade" },
      });

      // Fallback: Edge Function not deployed? Use demo upgrade RPC (no payment)
      if (error && confirmDialog.action === "upgrade") {
        const errMsg = String(error?.message || "").toLowerCase();
        if (errMsg.includes("edge function") || errMsg.includes("functions.invoke") || errMsg.includes("failed to send")) {
          const { error: rpcErr } = await supabase.rpc("demo_upgrade_plan", {
            p_tenant_id: tenant.id,
            p_plan_id: targetPlan.id,
          });
          if (!rpcErr) {
            toast({ title: "🎉 Plan Activated (demo)", description: "Upgraded via demo mode. Deploy Edge Functions for real payments." });
            setConfirmDialog({ open: false, plan: null, action: "upgrade" });
            await fetchAll();
            return;
          }
        }
        throw error;
      }
      if (error) throw error;

      if (data?.type === "activated") {
        toast({ title: "🎉 Plan Activated!", description: "Your plan has been upgraded successfully." });
        setConfirmDialog({ open: false, plan: null, action: "upgrade" });
        await fetchAll();
        return;
      }

      if (data?.type === "payment_required") {
        // Open Razorpay checkout
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Failed to load payment SDK");

        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: "StayFinder Platform",
          description: `Upgrade to ${data.plan_name}`,
          order_id: data.order_id,
          prefill: { name: tenant.owner_name, email: tenant.email, contact: tenant.phone },
          theme: { color: "#6366f1" },
          handler: async (response: any) => {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                tenant_id: tenant.id,
                plan_id: targetPlan.id,
                amount: data.final_amount,
                currency: "INR",
              },
            });
            if (verifyError || !verifyData?.success) {
              toast({ title: "Payment verification failed", description: verifyError?.message || verifyData?.error, variant: "destructive" });
            } else {
              toast({ title: "🎉 Plan Upgraded!", description: `You're now on the ${targetPlan.plan_name} plan.` });
              await fetchAll();
            }
            setConfirmDialog({ open: false, plan: null, action: "upgrade" });
          },
          modal: { ondismiss: () => setProcessing(false) },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (r: any) => {
          toast({ title: "Payment Failed", description: r.error?.description, variant: "destructive" });
          setProcessing(false);
        });
        razorpay.open();
        return;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const statusColor = (s: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", trial: "secondary", expired: "destructive", cancelled: "outline", suspended: "destructive",
    };
    return map[s] || "outline";
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-muted-foreground">Manage your plan, upgrade, and view payment history</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{plan?.plan_name || "No Plan"}</h3>
                <Badge variant={statusColor(subscription?.status || tenant?.status || "trial")}>
                  {subscription?.status || tenant?.status || "trial"}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-primary">
                ₹{plan?.price || 0}<span className="text-sm text-muted-foreground font-normal">/{plan?.billing_cycle || "month"}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Next billing: {subscription?.renewal_date ? format(new Date(subscription.renewal_date), "MMM d, yyyy") : "N/A"}
              </div>
              {subscription?.scheduled_plan_id && (
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs border-amber-500/50 bg-amber-500/10 text-amber-700">
                    <ArrowDownCircle className="h-3 w-3 mr-1" /> Downgrade to {scheduledPlanName || "lower plan"} scheduled
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Effective: {subscription.renewal_date ? format(new Date(subscription.renewal_date), "MMM d, yyyy") : "next cycle"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Current plan limits */}
          {plan && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Stays", value: limitLabel(plan.max_stays) },
                { label: "Rooms", value: limitLabel(plan.max_rooms) },
                { label: "Bookings/mo", value: limitLabel(plan.max_bookings_per_month) },
                { label: "AI Searches", value: limitLabel(plan.max_ai_search) },
              ].map((item) => (
                <div key={item.label} className="bg-background/60 rounded-lg p-3 text-center border">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-bold text-lg">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowUpCircle className="h-5 w-5" /> Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isCurrent = p.id === plan?.id;
              const isUpgrade = plan ? p.price > plan.price : true;
              const isDowngrade = plan ? p.price < plan.price : false;

              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl border-2 p-5 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-sm">Current Plan</Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3 mt-1">
                    {planIcon(p.plan_name)}
                    <h4 className="font-bold text-lg">{p.plan_name}</h4>
                  </div>

                  <p className="text-3xl font-bold mb-4">
                    ₹{p.price}
                    <span className="text-sm text-muted-foreground font-normal">/{p.billing_cycle}</span>
                  </p>

                  <ul className="space-y-2 mb-5 text-sm">
                    {[
                      `${limitLabel(p.max_stays)} stays`,
                      `${limitLabel(p.max_rooms)} rooms`,
                      `${limitLabel(p.max_bookings_per_month)} bookings/mo`,
                      `${limitLabel(p.max_ai_search)} AI searches`,
                    ].map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Check className="h-4 w-4 mr-1" /> Active
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isUpgrade ? "default" : "outline"}
                      onClick={() => handlePlanAction(p)}
                    >
                      {isUpgrade ? (
                        <><ArrowUpCircle className="h-4 w-4 mr-1" /> Upgrade</>
                      ) : (
                        <><ArrowDownCircle className="h-4 w-4 mr-1" /> Downgrade</>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transaction_id}</TableCell>
                    <TableCell className="font-medium">₹{tx.amount}</TableCell>
                    <TableCell className="text-xs capitalize">{tx.payment_method || tx.payment_gateway || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "success" ? "default" : tx.status === "failed" ? "destructive" : "outline"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(tx.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => !processing && setConfirmDialog({ ...confirmDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "upgrade" ? "Upgrade" : "Downgrade"} to {confirmDialog.plan?.plan_name}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "upgrade"
                ? "You'll be charged the prorated difference for the remainder of your billing cycle."
                : `Your plan will change to ${confirmDialog.plan?.plan_name} on your next billing date. You'll continue to have access to your current plan until then.`}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New plan</span>
              <span className="font-medium">{confirmDialog.plan?.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">₹{confirmDialog.plan?.price}/{confirmDialog.plan?.billing_cycle}</span>
            </div>
            {confirmDialog.action === "downgrade" && subscription?.renewal_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective from</span>
                <span className="font-medium">{format(new Date(subscription.renewal_date), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              variant={confirmDialog.action === "upgrade" ? "default" : "outline"}
              onClick={executePlanChange}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</>
              ) : confirmDialog.action === "upgrade" ? (
                <><CreditCard className="h-4 w-4 mr-1" /> Pay & Upgrade</>
              ) : (
                "Schedule Downgrade"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountBilling;
