"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { RefreshCw, Store, Plus, Pencil, BarChart3, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { MarketplaceThemeBuilderPanel } from "@/components/saas-admin/MarketplaceThemeBuilderPanel";
import { MarketplacePluginBuilderPanel } from "@/components/saas-admin/MarketplacePluginBuilderPanel";
import { safeValidatePluginManifest, safeValidateThemeManifest } from "@/lib/marketplace-manifest";

type Item = Tables<"marketplace_items">;
type Install = Tables<"tenant_marketplace_installs">;

const defaultManifest = (type: "theme" | "plugin") =>
  type === "theme"
    ? JSON.stringify({ preset: "ocean", tokens: {}, layout: "default" }, null, 2)
    : JSON.stringify({ plugin_key: "demo_widget", settings: {} }, null, 2);

export default function SaasAdminMarketplace() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [txSum, setTxSum] = useState(0);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const [txRevenueByItem, setTxRevenueByItem] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    type: "theme" as "theme" | "plugin",
    slug: "",
    name: "",
    description: "",
    pricing_model: "free" as "free" | "one_time" | "recurring",
    price: 0,
    billing_interval: "" as "" | "monthly" | "yearly",
    is_published: false,
    manifest_json: defaultManifest("theme"),
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [iRes, insRes, txRes, txByItemRes] = await Promise.all([
      supabase.from("marketplace_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("tenant_marketplace_installs").select("*"),
      supabase.from("transactions").select("amount").not("marketplace_item_id", "is", null).eq("status", "success"),
      supabase.from("transactions").select("amount, marketplace_item_id").eq("status", "success").not("marketplace_item_id", "is", null),
    ]);
    if (iRes.data) setItems(iRes.data as Item[]);
    if (insRes.data) {
      setInstalls(insRes.data as Install[]);
      const ids = [...new Set(insRes.data.map((r) => r.tenant_id))];
      if (ids.length) {
        const { data: tenants } = await supabase.from("tenants").select("id, tenant_name, domain").in("id", ids);
        if (tenants) {
          setTenantNames(
            Object.fromEntries(tenants.map((t) => [t.id, t.tenant_name || t.domain || t.id.slice(0, 8)]))
          );
        }
      } else setTenantNames({});
    } else {
      setInstalls([]);
      setTenantNames({});
    }
    if (txRes.data?.length) {
      setTxSum(txRes.data.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    } else setTxSum(0);
    const rev: Record<string, number> = {};
    for (const r of txByItemRes.data || []) {
      if (!r.marketplace_item_id) continue;
      rev[r.marketplace_item_id] = (rev[r.marketplace_item_id] || 0) + (Number(r.amount) || 0);
    }
    setTxRevenueByItem(rev);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      type: "theme",
      slug: "",
      name: "",
      description: "",
      pricing_model: "free",
      price: 0,
      billing_interval: "",
      is_published: false,
      manifest_json: defaultManifest("theme"),
    });
    setDialogOpen(true);
  };

  const openEdit = (row: Item) => {
    setEditing(row);
    setForm({
      type: row.type,
      slug: row.slug,
      name: row.name,
      description: row.description || "",
      pricing_model: row.pricing_model,
      price: Number(row.price),
      billing_interval: row.billing_interval ?? "",
      is_published: row.is_published,
      manifest_json: JSON.stringify(row.manifest ?? {}, null, 2),
    });
    setDialogOpen(true);
  };

  const saveItem = async () => {
    let manifest: Record<string, unknown> = {};
    try {
      manifest = JSON.parse(form.manifest_json || "{}");
    } catch {
      toast({ title: "Invalid JSON", description: "Fix manifest JSON.", variant: "destructive" });
      return;
    }

    if (form.type === "theme") {
      const v = safeValidateThemeManifest(manifest);
      if (!v.success) {
        toast({
          title: "Invalid theme manifest",
          description: v.error.errors.map((e) => e.message).join("; "),
          variant: "destructive",
        });
        return;
      }
      manifest = v.data as unknown as Record<string, unknown>;
    } else {
      const v = safeValidatePluginManifest(manifest);
      if (!v.success) {
        toast({
          title: "Invalid plugin manifest",
          description: v.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
          variant: "destructive",
        });
        return;
      }
      manifest = v.data as unknown as Record<string, unknown>;
    }

    const payload = {
      type: form.type,
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: form.name.trim(),
      description: form.description,
      pricing_model: form.pricing_model,
      price: form.price,
      billing_interval: form.pricing_model === "recurring" ? form.billing_interval || "monthly" : null,
      is_published: form.is_published,
      manifest: manifest as Item["manifest"],
      updated_at: new Date().toISOString(),
    };

    if (!payload.slug || !payload.name) {
      toast({ title: "Required", description: "Slug and name are required.", variant: "destructive" });
      return;
    }

    if (editing) {
      const { error } = await supabase.from("marketplace_items").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("marketplace_items").insert({
        ...payload,
        version: "1.0.0",
        currency: "INR",
        sort_order: items.length,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Created" });
    }
    setDialogOpen(false);
    load();
  };

  const installsByItem = installs.reduce<Record<string, number>>((acc, row) => {
    if (row.status === "installed") acc[row.item_id] = (acc[row.item_id] || 0) + 1;
    return acc;
  }, {});

  const chartData = items.slice(0, 12).map((it) => ({
    name: it.name.length > 12 ? it.name.slice(0, 10) + "…" : it.name,
    installs: installsByItem[it.id] || 0,
  }));

  const revenueChartData = items
    .filter((it) => (txRevenueByItem[it.id] || 0) > 0)
    .slice(0, 12)
    .map((it) => ({
      name: it.name.length > 12 ? it.name.slice(0, 10) + "…" : it.name,
      revenue: Math.round((txRevenueByItem[it.id] || 0) * 100) / 100,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Catalog, installs, and revenue from marketplace transactions.</p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          New item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Marketplace revenue (success)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{format(txSum)}</p>
            <p className="text-xs text-muted-foreground mt-1">Sum of transactions with marketplace_item_id</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              Catalog items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total installs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{installs.filter((i) => i.status === "installed").length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="theme-builder">Theme Builder</TabsTrigger>
          <TabsTrigger value="plugin-builder">Plugin Builder</TabsTrigger>
          <TabsTrigger value="installs">Installs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
              <CardDescription>Published items appear to tenants when Marketplace is enabled on their plan.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.pricing_model === "free" ? "Free" : format(Number(row.price))}
                      </TableCell>
                      <TableCell>{row.is_published ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme-builder" className="mt-4">
          <MarketplaceThemeBuilderPanel
            existingSlugs={new Set(items.map((i) => i.slug))}
            onSaved={() => load()}
          />
        </TabsContent>

        <TabsContent value="plugin-builder" className="mt-4">
          <MarketplacePluginBuilderPanel
            existingSlugs={new Set(items.map((i) => i.slug))}
            onSaved={() => load()}
          />
        </TabsContent>

        <TabsContent value="installs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant installs</CardTitle>
              <CardDescription>Which tenants installed which items.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Installed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                        No installs yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    installs.map((row) => {
                      const item = items.find((i) => i.id === row.item_id);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm max-w-[200px] truncate" title={tenantNames[row.tenant_id] || row.tenant_id}>
                            {tenantNames[row.tenant_id] || `${row.tenant_id.slice(0, 8)}…`}
                          </TableCell>
                          <TableCell>{item?.name ?? row.item_id}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(row.installed_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Installs by item</CardTitle>
              <CardDescription>Successful installs per catalog row.</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.every((d) => d.installs === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-8">No install data to chart yet.</p>
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="installs" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by item (success)</CardTitle>
              <CardDescription>Sum of marketplace-linked transactions per item.</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No marketplace revenue recorded yet.</p>
              ) : (
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => format(v)} />
                      <Bar dataKey="revenue" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "New marketplace item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => {
                    const t = v as "theme" | "plugin";
                    setForm((f) => ({
                      ...f,
                      type: t,
                      manifest_json: f.manifest_json || defaultManifest(t),
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theme">Theme</SelectItem>
                    <SelectItem value="plugin">Plugin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pricing</Label>
                <Select
                  value={form.pricing_model}
                  onValueChange={(v) => setForm((f) => ({ ...f, pricing_model: v as typeof f.pricing_model }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="mt-1" placeholder="ocean-breeze" />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
            </div>
            {form.pricing_model !== "free" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: +e.target.value }))}
                    className="mt-1"
                  />
                </div>
                {form.pricing_model === "recurring" && (
                  <div>
                    <Label>Interval</Label>
                    <Select
                      value={form.billing_interval || "monthly"}
                      onValueChange={(v) => setForm((f) => ({ ...f, billing_interval: v as typeof f.billing_interval }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} id="pub" />
              <Label htmlFor="pub">Published</Label>
            </div>
            <div>
              <Label>Manifest (JSON)</Label>
              <Textarea
                value={form.manifest_json}
                onChange={(e) => setForm((f) => ({ ...f, manifest_json: e.target.value }))}
                className="mt-1 font-mono text-xs"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
