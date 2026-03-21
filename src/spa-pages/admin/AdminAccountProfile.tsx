import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Building2, Mail, Phone, Save } from "lucide-react";

const AdminAccountProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data } = tenantId ? await supabase.from("tenants").select("*").eq("id", tenantId).single() : { data: null };
    setTenant(data);
    setLoading(false);
  };

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        tenant_name: tenant.tenant_name,
        owner_name: tenant.owner_name,
        email: tenant.email,
        phone: tenant.phone,
      })
      .eq("id", tenant.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!tenant) return <p className="text-center text-muted-foreground py-20">No tenant found</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-muted-foreground">Manage your resort profile information</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Resort Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Owner Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={tenant.owner_name} onChange={(e) => setTenant({ ...tenant, owner_name: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Resort Name</Label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={tenant.tenant_name} onChange={(e) => setTenant({ ...tenant, tenant_name: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="tel" value={tenant.phone} onChange={(e) => setTenant({ ...tenant, phone: e.target.value })} className="pl-9" />
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccountProfile;
