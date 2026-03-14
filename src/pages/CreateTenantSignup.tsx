import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, Check, X, MessageCircle } from "lucide-react";

const slugifySubdomain = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

const CreateTenantSignup = () => {
  const [loading, setLoading] = useState(false);
  const [subdomainSuffix, setSubdomainSuffix] = useState(".travelvoo.in");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const checkingRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    subdomain: "",
    email: "",
    password: "",
    confirmPassword: "",
    whatsappNumber: "",
  });

  useEffect(() => {
    supabase
      .from("saas_platform_settings")
      .select("setting_value")
      .eq("setting_key", "platform_subdomain_suffix")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.setting_value) setSubdomainSuffix(data.setting_value);
      });
  }, []);

  useEffect(() => {
    const slug = slugifySubdomain(form.subdomain);
    if (!slug || slug.length < 2) {
      setSubdomainStatus("idle");
      checkingRef.current = null;
      return;
    }
    setSubdomainStatus("checking");
    checkingRef.current = slug;
    const t = setTimeout(async () => {
      const slugAtCheck = slug;
      const { data } = await supabase
        .from("tenant_domains")
        .select("id")
        .eq("subdomain", slugAtCheck)
        .maybeSingle();
      if (checkingRef.current === slugAtCheck) {
        setSubdomainStatus(data ? "taken" : "available");
        checkingRef.current = null;
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.subdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName?.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    const slug = slugifySubdomain(form.subdomain);
    if (!form.subdomain?.trim()) {
      toast({ title: "Subdomain is required", variant: "destructive" });
      return;
    }
    if (!slug || slug.length < 2) {
      toast({ title: "Invalid subdomain", description: "Use letters, numbers, hyphens (min 2 chars)", variant: "destructive" });
      return;
    }
    if (subdomainStatus === "taken") {
      toast({ title: "Subdomain taken", description: `"${slug}" is already in use`, variant: "destructive" });
      return;
    }
    if (subdomainStatus === "checking") {
      toast({ title: "Please wait", description: "Checking subdomain availability...", variant: "destructive" });
      return;
    }
    if (!form.email?.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    const phone = form.whatsappNumber?.trim().replace(/\D/g, "") || "";

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      const { data: starterPlan } = await supabase
        .from("plans")
        .select("id")
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          tenant_name: form.companyName.trim(),
          owner_name: form.companyName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: phone || form.email.trim(),
          domain: slug,
          status: "trial",
          plan_id: starterPlan?.id || null,
          user_id: userId,
        })
        .select()
        .single();
      if (tenantError) throw tenantError;

      const { error: domainErr } = await supabase.from("tenant_domains").insert({
        tenant_id: tenant.id,
        subdomain: slug,
      });
      if (domainErr) throw domainErr;

      if (starterPlan?.id) {
        const renewal = new Date();
        renewal.setDate(renewal.getDate() + 14);
        await supabase.from("subscriptions").insert({
          tenant_id: tenant.id,
          plan_id: starterPlan.id,
          status: "trial",
          billing_cycle: "monthly",
          renewal_date: renewal.toISOString().split("T")[0],
        });
      }

      await supabase.from("tenant_usage").insert({ tenant_id: tenant.id });
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });

      toast({ title: "Welcome aboard!", description: "Your 14-day trial has started. Check your email to verify." });
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>Start your free trial in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="pl-9"
                  placeholder="Green Leaf Resort"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Subdomain *</Label>
              <div className="mt-1 space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={form.subdomain}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        setForm({ ...form, subdomain: v });
                      }}
                      className="pr-20"
                      placeholder="greenleaf"
                      minLength={2}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">{subdomainSuffix}</span>
                  </div>
                  {subdomainStatus === "checking" && <span className="flex items-center text-sm text-muted-foreground shrink-0">Checking…</span>}
                  {subdomainStatus === "available" && <span className="flex items-center text-sm text-emerald-600 shrink-0"><Check className="w-4 h-4 mr-1" /> Available</span>}
                  {subdomainStatus === "taken" && <span className="flex items-center text-sm text-destructive shrink-0"><X className="w-4 h-4 mr-1" /> Taken</span>}
                </div>
                {form.subdomain && (
                  <p className="text-xs text-muted-foreground font-mono">{slugifySubdomain(form.subdomain) || form.subdomain}{subdomainSuffix}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9"
                  placeholder="admin@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Password *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Confirm Password *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="pl-9"
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            <div>
              <Label>WhatsApp Number</Label>
              <div className="relative mt-1">
                <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  className="pl-9"
                  placeholder="+91 9876543210 or 919876543210"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account? <a href="/admin/login" className="text-primary hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTenantSignup;
