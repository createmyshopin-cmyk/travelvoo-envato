import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock } from "lucide-react";
import { resolveTenantFromHostname } from "@/hooks/useAdminAuth";
import { DemoLoginHint, DEMO_TENANT_ADMIN } from "@/components/DemoLoginHint";
import { loginFailureDescription } from "@/lib/loginFailureMessage";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Login failed", description: loginFailureDescription(error.message), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Verify admin role
    const { data: hasRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    if (roleError || !hasRole) {
      await supabase.auth.signOut();
      toast({ title: "Access denied", description: "You don't have admin privileges.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Verify this user owns the tenant for the current subdomain
    const resolvedTenantId = await resolveTenantFromHostname();

    if (resolvedTenantId) {
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("id")
        .eq("id", resolvedTenantId)
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!tenantRow) {
        await supabase.auth.signOut();
        toast({
          title: "Access denied",
          description: "This account does not belong to this property.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    toast({ title: "Welcome back!", description: "Redirecting to dashboard..." });
    router.push("/admin/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Sign in to manage your stays and bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DemoLoginHint
            variant="tenant"
            onFillDemo={() => {
              setEmail(DEMO_TENANT_ADMIN.email);
              setPassword(DEMO_TENANT_ADMIN.password);
            }}
          />
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
