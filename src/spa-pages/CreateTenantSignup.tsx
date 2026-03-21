import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, Check, X, MessageCircle, Loader2 } from "lucide-react";

const slugifySubdomain = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");

/** Extract subdomain suggestion from email: admin@greenleaf.com → greenleaf */
const subdomainFromEmail = (email: string) => {
  const local = email.split("@")[0]?.trim() || "";
  return slugifySubdomain(local);
};

const CreateTenantSignup = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [subdomainSuffix, setSubdomainSuffix] = useState(".travelvoo.in");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const checkingRef = useRef<string | null>(null);
  const router = useRouter();

  // Guard: /create-account must only be accessible on the root/main domain.
  // If someone visits it on a tenant subdomain (e.g. demo.travelvoo.in/create-account),
  // redirect them to the same path on the root domain (travelvoo.in/create-account).
  useEffect(() => {
    const hostname = window.location.hostname;
    // Skip for localhost and known preview/CI domains
    if (
      hostname === "localhost" ||
      hostname.includes("lovable.app") ||
      hostname.includes("lovableproject.com") ||
      hostname.includes("vercel.app")
    ) return;

    const parts = hostname.split(".");
    // 3+ parts AND first part is not "www" means a real tenant subdomain
    // e.g. demo.travelvoo.in → redirect, but www.travelvoo.in → allow
    if (parts.length >= 3 && parts[0] !== "www") {
      const rootDomain = parts.slice(1).join(".");
      window.location.replace(`https://www.${rootDomain}/create-account`);
    }
  }, []);

  const [form, setForm] = useState({
    companyName: "",
    subdomain: "",
    email: "",
    password: "",
    confirmPassword: "",
    whatsappNumber: "",
  });

  // Handle OAuth callback: session + pendingTenantSignup in sessionStorage
  useEffect(() => {
    const run = async () => {
      // If an OAuth redirect landed back on a subdomain, let the domain guard above handle it
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      if (
        parts.length >= 3 &&
        parts[0] !== "www" &&
        !hostname.includes("lovable.app") &&
        !hostname.includes("lovableproject.com") &&
        !hostname.includes("vercel.app")
      ) return;

      const pending = sessionStorage.getItem("pendingTenantSignup");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !pending) return;
      try {
        const { companyName, subdomain, whatsappNumber } = JSON.parse(pending);
        setLoading(true);
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s?.access_token) throw new Error("No session");
        const { data, error } = await supabase.functions.invoke("create-tenant-from-oauth", {
          body: { companyName: companyName?.trim(), subdomain: slugifySubdomain(subdomain || ""), whatsappNumber: (whatsappNumber || "").replace(/\D/g, "") || undefined },
          headers: { Authorization: `Bearer ${s.access_token}` },
        });
        sessionStorage.removeItem("pendingTenantSignup");
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.already_has_account) {
          toast({ title: "You already have an account", description: "Sign in to access your dashboard." });
          sessionStorage.removeItem("pendingTenantSignup");
          router.replace("/login");
          setLoading(false);
          return;
        }
        toast({ title: "Welcome aboard!", description: "Your account & 3-day trial are ready." });
        router.push("/admin/dashboard");
      } catch (err: any) {
        toast({ title: "Signup failed", description: err?.message, variant: "destructive" });
        sessionStorage.removeItem("pendingTenantSignup");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  // Block tenant admins from /create-account; only public (unauthenticated) or SaaS admin can create
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthChecking(false);
        return; // Public signup allowed
      }
      const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "super_admin" });
      if (isSuperAdmin) {
        setAuthChecking(false);
        return; // SaaS admin allowed
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (isAdmin) {
        toast({ title: "Not allowed", description: "Tenant accounts cannot create new accounts. Contact your SaaS administrator.", variant: "destructive" });
        router.replace("/admin/dashboard");
        return;
      }
      setAuthChecking(false);
    };
    check();
  }, [router]);

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
      // Snapshot whether a super admin is creating this account on behalf of someone else
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      const isSuperAdminCreating = !!existingSession;

      const { data, error } = await supabase.functions.invoke("create-tenant-signup", {
        body: {
          companyName: form.companyName.trim(),
          subdomain: slug,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          whatsappNumber: phone || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (isSuperAdminCreating) {
        // Super admin created the account — stay logged in as super admin,
        // don't hijack their session by signing in as the new user.
        toast({
          title: "Account created!",
          description: `New tenant account for "${form.companyName.trim()}" is ready. They can now log in at their subdomain.`,
        });
        setLoading(false);
        return;
      }

      // New visitor signup — sign out any stale session first, then sign in as the new account
      await supabase.auth.signOut();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      if (signInErr) throw signInErr;

      toast({ title: "Welcome aboard!", description: "Your account & 3-day trial are ready." });
      router.push("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
                  onChange={(e) => {
                    const email = e.target.value;
                    const suggested = subdomainFromEmail(email);
                    setForm((prev) => ({
                      ...prev,
                      email,
                      subdomain: prev.subdomain || suggested,
                    }));
                  }}
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

            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? "Creating…" : "Create Account"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading || googleLoading}
              onClick={async () => {
                const slug = slugifySubdomain(form.subdomain);
                if (!form.companyName?.trim()) {
                  toast({ title: "Company name is required", variant: "destructive" });
                  return;
                }
                if (!form.subdomain?.trim() || !slug || slug.length < 2) {
                  toast({ title: "Valid subdomain required", description: "Use letters, numbers, hyphens (min 2 chars)", variant: "destructive" });
                  return;
                }
                if (subdomainStatus === "taken") {
                  toast({ title: "Subdomain taken", variant: "destructive" });
                  return;
                }
                setGoogleLoading(true);
                try {
                  sessionStorage.setItem(
                    "pendingTenantSignup",
                    JSON.stringify({
                      companyName: form.companyName.trim(),
                      subdomain: slug,
                      whatsappNumber: form.whatsappNumber?.trim().replace(/\D/g, "") || undefined,
                    })
                  );
                  // Always redirect OAuth back to the root domain, never a tenant subdomain
                  const hostname = window.location.hostname;
                  const parts = hostname.split(".");
                  const rootOrigin =
                    parts.length >= 3 &&
                    parts[0] !== "www" &&
                    !hostname.includes("localhost") &&
                    !hostname.includes("lovable.app") &&
                    !hostname.includes("vercel.app")
                      ? `https://www.${parts.slice(1).join(".")}`
                      : window.location.origin;

                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${rootOrigin}/create-account` },
                  });
                  if (error) throw error;
                } catch (err: any) {
                  toast({ title: "Google sign-up failed", description: err?.message, variant: "destructive" });
                  sessionStorage.removeItem("pendingTenantSignup");
                } finally {
                  setGoogleLoading(false);
                }
              }}
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Sign up with Google
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTenantSignup;
