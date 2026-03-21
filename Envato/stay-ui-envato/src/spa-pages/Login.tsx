import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2 } from "lucide-react";

/**
 * Tenant accounts login only.
 * Super admins are redirected to /saas-admin/login.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const processPostLogin = async (userId: string) => {
    const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    if (isSuperAdmin) {
      await supabase.auth.signOut();
      toast({ title: "Use platform admin login", description: "Platform admins sign in at /saas-admin/login", variant: "destructive" });
      router.replace("/saas-admin/login");
      return;
    }
    const { data: hasAdminRole, error: roleError } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (roleError || !hasAdminRole) {
      await supabase.auth.signOut();
      toast({ title: "Access denied", description: "Create an account first below, or ask your platform admin to grant you access.", variant: "destructive" });
      return;
    }
    toast({ title: "Welcome back!", description: "Redirecting to dashboard..." });
    const hostname = window.location.hostname;
    const isPlatformDomain = hostname === "localhost" || hostname.includes("vercel.app") || hostname.includes("lovable.app") || hostname.split(".").length < 3;
    if (isPlatformDomain) {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("user_id", userId).maybeSingle();
      if (tenant) {
        const { data: domain } = await supabase.from("tenant_domains").select("subdomain").eq("tenant_id", tenant.id).not("subdomain", "is", null).limit(1).maybeSingle();
        const { data: suffixRow } = await supabase.from("saas_platform_settings").select("setting_value").eq("setting_key", "platform_subdomain_suffix").maybeSingle();
        const suffix = suffixRow?.setting_value || ".travelvoo.in";
        const baseDomain = suffix.replace(/^\./, "");
        if (domain?.subdomain && baseDomain) {
          window.location.href = `https://${domain.subdomain}.${baseDomain}/admin/dashboard`;
          return;
        }
      }
    }
    router.replace("/admin/dashboard");
  };

  useEffect(() => {
    const checkOAuthCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || loading) return;
      const hashParams = new URLSearchParams(window.location.hash?.slice(1) || "");
      if (hashParams.get("access_token") || window.location.search.includes("code=")) {
        setLoading(true);
        await processPostLogin(session.user.id);
        window.history.replaceState({}, "", window.location.pathname);
        setLoading(false);
      }
    };
    checkOAuthCallback();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    await processPostLogin(data.user.id);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in to manage your stays and bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/login` },
                });
                if (error) {
                  toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
                  setLoading(false);
                }
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span className={loading ? "sr-only" : ""}>Sign in with Google</span>
              {!loading && (
                <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link href="/create-account" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
