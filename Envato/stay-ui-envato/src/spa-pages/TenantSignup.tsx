import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, User, Mail, Phone, Lock, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = ["Account", "Resort Info", "Review"];

const TenantSignup = () => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    ownerName: "",
    resortName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const subdomain = form.resortName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const validateStep = () => {
    if (step === 0) {
      if (!form.email || !form.password || !form.confirmPassword) {
        toast({ title: "Please fill all fields", variant: "destructive" });
        return false;
      }
      if (form.password.length < 6) {
        toast({ title: "Password must be at least 6 characters", variant: "destructive" });
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast({ title: "Passwords do not match", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (!form.ownerName || !form.resortName || !form.phone) {
        toast({ title: "Please fill all fields", variant: "destructive" });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      const userId = authData.user.id;

      // 2. Get starter plan
      const { data: starterPlan } = await supabase
        .from("plans")
        .select("id")
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(1)
        .single();

      // 3. Create tenant (link to auth user for RLS)
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          tenant_name: form.resortName,
          owner_name: form.ownerName,
          email: form.email,
          phone: form.phone,
          domain: subdomain,
          status: "trial",
          plan_id: starterPlan?.id || null,
          user_id: userId,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 4. Create domain record
      await supabase.from("tenant_domains").insert({
        tenant_id: tenant.id,
        subdomain: subdomain,
      });

      // 5. Create subscription (14-day trial)
      if (starterPlan?.id) {
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + 14);
        await supabase.from("subscriptions").insert({
          tenant_id: tenant.id,
          plan_id: starterPlan.id,
          status: "trial",
          billing_cycle: "monthly",
          renewal_date: renewalDate.toISOString().split("T")[0],
        });
      }

      // 6. Create usage record
      await supabase.from("tenant_usage").insert({ tenant_id: tenant.id });

      // 7. Assign admin role
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });

      toast({ title: "🎉 Welcome aboard!", description: "Your 14-day trial has started. Check your email to verify your account." });
      router.push("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-lg shadow-xl border-primary/10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
          <CardDescription>Set up your resort booking platform in minutes</CardDescription>
        </CardHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 px-6 pb-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="pl-9" placeholder="you@resort.com" required />
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="pl-9" placeholder="Min 6 characters" required />
                    </div>
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="pl-9" placeholder="Re-enter password" required />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Owner Name</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} className="pl-9" placeholder="John Doe" required />
                    </div>
                  </div>
                  <div>
                    <Label>Resort Name</Label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input value={form.resortName} onChange={(e) => update("resortName", e.target.value)} className="pl-9" placeholder="Green Leaf Resort" required />
                    </div>
                  </div>
                  {subdomain && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      Your subdomain: <span className="font-mono text-primary">{subdomain}.stayfinder.app</span>
                    </p>
                  )}
                  <div>
                    <Label>Phone</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="pl-9" placeholder="+91 9876543210" required />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 text-sm">
                  <h3 className="font-semibold text-base">Review Your Details</h3>
                  <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{form.email}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="font-medium">{form.ownerName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Resort</span><span className="font-medium">{form.resortName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{form.phone}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subdomain</span><span className="font-mono text-primary">{subdomain}.stayfinder.app</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Trial</span><span className="font-medium text-green-600">14 days free</span></div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 2 ? (
              <Button onClick={() => validateStep() && setStep(step + 1)} className="flex-1">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSignup} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "🚀 Start Free Trial"}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account?{" "}
            <a href="/admin/login" className="text-primary hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSignup;
