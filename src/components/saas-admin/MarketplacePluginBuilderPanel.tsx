"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  defaultPluginSettings,
  safeValidatePluginManifest,
  type RegisteredPluginKey,
  REGISTERED_PLUGIN_KEYS,
} from "@/lib/marketplace-manifest";
import { Sparkles, Plus, Trash2 } from "lucide-react";

type Props = {
  existingSlugs: Set<string>;
  onSaved: () => void;
};

export function MarketplacePluginBuilderPanel({ existingSlugs, onSaved }: Props) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingModel, setPricingModel] = useState<"free" | "one_time" | "recurring">("free");
  const [price, setPrice] = useState(0);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isPublished, setIsPublished] = useState(false);
  const [pluginKey, setPluginKey] = useState<RegisteredPluginKey>("demo_widget");
  const [docUrl, setDocUrl] = useState("");

  const [waPhone, setWaPhone] = useState("");
  const [waLabel, setWaLabel] = useState("Chat on WhatsApp");
  const [footerLinks, setFooterLinks] = useState<{ title: string; href: string }[]>([{ title: "", href: "" }]);
  const [demoTitle, setDemoTitle] = useState("");

  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const buildManifest = () => {
    const doc_url = docUrl.trim() || undefined;
    if (pluginKey === "whatsapp_widget") {
      return {
        plugin_key: "whatsapp_widget" as const,
        settings: { phone: waPhone.trim(), label: waLabel.trim() || undefined },
        ...(doc_url ? { doc_url } : {}),
      };
    }
    if (pluginKey === "extra_footer_links") {
      const links = footerLinks
        .map((l) => ({ title: l.title.trim(), href: l.href.trim() }))
        .filter((l) => l.title && l.href);
      return {
        plugin_key: "extra_footer_links" as const,
        settings: { links },
        ...(doc_url ? { doc_url } : {}),
      };
    }
    return {
      plugin_key: "demo_widget" as const,
      settings: demoTitle.trim() ? { title: demoTitle.trim() } : {},
      ...(doc_url ? { doc_url } : {}),
    };
  };

  const suggestAi = async () => {
    setAiBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/saas-admin/marketplace/ai-suggest", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: description || name || `plugin ${pluginKey}`,
          type: "plugin",
          plugin_key: pluginKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "AI unavailable", description: data.error || res.statusText, variant: "destructive" });
        return;
      }
      const m = data.manifest as { plugin_key?: string; settings?: Record<string, unknown>; doc_url?: string };
      if (m.plugin_key && REGISTERED_PLUGIN_KEYS.includes(m.plugin_key as RegisteredPluginKey)) {
        setPluginKey(m.plugin_key as RegisteredPluginKey);
      }
      if (m.doc_url) setDocUrl(m.doc_url);
      const s = m.settings ?? {};
      if (m.plugin_key === "whatsapp_widget" || pluginKey === "whatsapp_widget") {
        if (typeof s.phone === "string") setWaPhone(s.phone);
        if (typeof s.label === "string") setWaLabel(s.label);
      }
      if (m.plugin_key === "extra_footer_links" && Array.isArray(s.links)) {
        const links = s.links as { title?: string; href?: string }[];
        setFooterLinks(
          links.length
            ? links.map((l) => ({ title: l.title ?? "", href: l.href ?? "" }))
            : [{ title: "", href: "" }]
        );
      }
      if (m.plugin_key === "demo_widget" && s.title) setDemoTitle(String(s.title));
      toast({ title: "Manifest filled", description: "Review and save." });
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    const slugNorm = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slugNorm || !name.trim()) {
      toast({ title: "Required", description: "Slug and name are required.", variant: "destructive" });
      return;
    }
    if (existingSlugs.has(slugNorm)) {
      toast({ title: "Slug taken", description: "Use a different slug.", variant: "destructive" });
      return;
    }

    const raw = buildManifest();
    const parsed = safeValidatePluginManifest(raw);
    if (!parsed.success) {
      toast({
        title: "Invalid manifest",
        description: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const payload = {
      type: "plugin" as const,
      slug: slugNorm,
      name: name.trim(),
      description,
      pricing_model: pricingModel,
      price,
      billing_interval: pricingModel === "recurring" ? billingInterval : null,
      is_published: isPublished,
      manifest: parsed.data as unknown as Record<string, unknown>,
      version: "1.0.0",
      currency: "INR",
      sort_order: 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("marketplace_items").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plugin saved to catalog" });
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plugin manifest</CardTitle>
        <CardDescription>
          Choose a registered plugin key. Runtime behavior lives in the codebase — catalog only enables + stores config.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Slug</Label>
            <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="whatsapp-pack" />
          </div>
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea className="mt-1" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Plugin key</Label>
          <Select
            value={pluginKey}
            onValueChange={(v) => {
              const k = v as RegisteredPluginKey;
              setPluginKey(k);
              const defs = defaultPluginSettings(k);
              if (k === "whatsapp_widget") {
                setWaPhone(String(defs.phone ?? ""));
                setWaLabel(String(defs.label ?? ""));
              }
              if (k === "demo_widget") setDemoTitle(String((defs as { title?: string }).title ?? ""));
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTERED_PLUGIN_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pluginKey === "whatsapp_widget" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Phone (E.164)</Label>
              <Input className="mt-1" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="+9198..." />
            </div>
            <div>
              <Label>Label</Label>
              <Input className="mt-1" value={waLabel} onChange={(e) => setWaLabel(e.target.value)} />
            </div>
          </div>
        )}

        {pluginKey === "extra_footer_links" && (
          <div className="space-y-2">
            <Label>Links</Label>
            {footerLinks.map((row, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Input placeholder="Title" value={row.title} onChange={(e) => {
                  const next = [...footerLinks];
                  next[i] = { ...next[i], title: e.target.value };
                  setFooterLinks(next);
                }} />
                <Input placeholder="https://…" value={row.href} onChange={(e) => {
                  const next = [...footerLinks];
                  next[i] = { ...next[i], href: e.target.value };
                  setFooterLinks(next);
                }} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFooterLinks((l) => l.filter((_, j) => j !== i))}
                  disabled={footerLinks.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFooterLinks((l) => [...l, { title: "", href: "" }])}
            >
              <Plus className="h-4 w-4 mr-1" /> Add link
            </Button>
          </div>
        )}

        {pluginKey === "demo_widget" && (
          <div>
            <Label>Widget title</Label>
            <Input className="mt-1" value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)} placeholder="Optional" />
          </div>
        )}

        <div>
          <Label>Documentation URL (optional)</Label>
          <Input className="mt-1" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Pricing</Label>
            <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as typeof pricingModel)}>
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
          {pricingModel !== "free" && (
            <div>
              <Label>Price (INR)</Label>
              <Input type="number" className="mt-1" value={price} onChange={(e) => setPrice(+e.target.value)} min={0} />
            </div>
          )}
        </div>
        {pricingModel === "recurring" && (
          <div>
            <Label>Interval</Label>
            <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as typeof billingInterval)}>
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
        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} id="plug-pub" />
          <Label htmlFor="plug-pub">Published</Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={suggestAi} disabled={aiBusy}>
            <Sparkles className="h-4 w-4 mr-1" />
            {aiBusy ? "Suggesting…" : "AI suggest"}
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save to catalog"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
