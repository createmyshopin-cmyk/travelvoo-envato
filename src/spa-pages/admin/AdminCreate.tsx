import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Building2 } from "lucide-react";

export default function AdminCreate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resortName, setResortName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Redirect to login if an admin already exists
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from("user_roles").select("id").eq("role", "admin").limit(1).maybeSingle();
      if (data) {
        router.replace("/admin/login");
        return;
      }
      setChecking(false);
    };
    check();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !resortName || !ownerName) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      const subdomain = resortName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "resort";

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
          tenant_name: resortName,
          owner_name: ownerName,
          email,
          domain: subdomain,
          status: "trial",
          plan_id: starterPlan?.id || null,
          user_id: userId,
        })
        .select()
        .single();
      if (tenantError) throw tenantError;

      await supabase.from("tenant_domains").insert({ tenant_id: tenant.id, subdomain });
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

      toast({ title: "Admin created", description: "Redirecting to dashboard..." });
      router.push("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Failed to create admin", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Admin</CardTitle>
          <CardDescription>Set up your first admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Email</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="admin@example.com" required />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="Min 6 characters" required minLength={6} />
              </div>
            </div>
            <div>
              <Label>Resort / Business Name</Label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={resortName} onChange={(e) => setResortName(e.target.value)} className="pl-9" placeholder="Green Leaf Resort" required />
              </div>
            </div>
            <div>
              <Label>Owner Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="pl-9" placeholder="John Doe" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Admin"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account? <a href="/admin/login" className="text-primary hover:underline">Sign in</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
