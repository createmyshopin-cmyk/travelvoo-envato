import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  published: boolean;
  created_at: string;
  expires_at: string | null;
}

const SaasAdminAnnouncements = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", target: "all" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems((data as Announcement[]) || []);
    setLoading(false);
  };

  const create = async () => {
    if (!form.title || !form.message) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    const { error } = await supabase.from("announcements").insert({ ...form, published: true });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Announcement published" }); setOpen(false); setForm({ title: "", message: "", type: "info", target: "all" }); fetchAll(); }
  };

  const togglePublish = async (id: string, published: boolean) => {
    await supabase.from("announcements").update({ published }).eq("id", id);
    fetchAll();
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchAll();
  };

  const typeColor = (t: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { info: "secondary", warning: "outline", critical: "destructive", feature: "default" };
    return map[t] || "secondary";
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">Send announcements to all tenants</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-1" rows={4} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants</SelectItem>
                      <SelectItem value="trial">Trial Only</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={create} className="w-full">Publish Announcement</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Megaphone className="mx-auto h-10 w-10 mb-3 opacity-40" /><p>No announcements yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{a.title}</h3>
                      <Badge variant={typeColor(a.type)}>{a.type}</Badge>
                      <Badge variant="outline">{a.target}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.created_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={a.published} onCheckedChange={(v) => togglePublish(a.id, v)} />
                      <span className="text-xs text-muted-foreground">{a.published ? "Live" : "Draft"}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SaasAdminAnnouncements;
