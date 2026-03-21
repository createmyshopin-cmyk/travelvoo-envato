"use client";

import { useState, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ALLOWED_LANDING_THEME_VARS } from "@/lib/marketplace-theme";
import { presetLabel, safeValidateThemeManifest, type ThemeManifest } from "@/lib/marketplace-manifest";
import { Sparkles } from "lucide-react";

type Props = {
  existingSlugs: Set<string>;
  onSaved: () => void;
};

export function MarketplaceThemeBuilderPanel({ existingSlugs, onSaved }: Props) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingModel, setPricingModel] = useState<"free" | "one_time" | "recurring">("free");
  const [price, setPrice] = useState(0);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [isPublished, setIsPublished] = useState(false);
  const [preset, setPreset] = useState<ThemeManifest["preset"]>("ocean");
  const [layout, setLayout] = useState<NonNullable<ThemeManifest["layout"]>>("default");
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const buildManifest = (): ThemeManifest => {
    const tokens: Record<string, string> = {};
    for (const key of ALLOWED_LANDING_THEME_VARS) {
      const v = (tokenInputs[key] ?? "").trim();
      if (v) tokens[key] = v;
    }
    const manifest: ThemeManifest = {
      preset,
      layout,
      tokens: Object.keys(tokens).length ? tokens : undefined,
    };
    return manifest;
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
        body: JSON.stringify({ brief: description || name || "modern travel landing", type: "theme" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "AI unavailable", description: data.error || res.statusText, variant: "destructive" });
        return;
      }
      const m = data.manifest as ThemeManifest;
      if (m.preset) setPreset(m.preset);
      if (m.layout) setLayout(m.layout);
      if (m.tokens && typeof m.tokens === "object") {
        const next: Record<string, string> = { ...tokenInputs };
        for (const [k, v] of Object.entries(m.tokens)) {
          if (typeof v === "string") next[k] = v;
        }
        setTokenInputs(next);
      }
      toast({ title: "Manifest filled", description: "Review tokens and save." });
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

    const manifest = buildManifest();
    const parsed = safeValidateThemeManifest(manifest);
    if (!parsed.success) {
      toast({
        title: "Invalid manifest",
        description: parsed.error.errors.map((e) => e.message).join("; "),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const payload = {
      type: "theme" as const,
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
    toast({ title: "Theme saved to catalog" });
    onSaved();
  };

  const previewStyle: CSSProperties = {};
  const m = buildManifest();
  const mergedTokens = m.tokens ?? {};
  for (const [k, v] of Object.entries(mergedTokens)) {
    (previewStyle as Record<string, string>)[k] = v.includes("hsl") || v.includes("#") ? v : `hsl(${v})`;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme manifest</CardTitle>
          <CardDescription>Preset, layout, and allowlisted CSS variables only — no uploaded code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Slug</Label>
              <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ocean-breeze" />
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Preset</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as ThemeManifest["preset"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["default", "ocean", "sunset", "forest"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {presetLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Layout</Label>
              <Select value={layout} onValueChange={(v) => setLayout(v as NonNullable<ThemeManifest["layout"]>)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default</SelectItem>
                  <SelectItem value="heroImmersive">heroImmersive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Token overrides (HSL components or full color)</Label>
            <p className="text-xs text-muted-foreground">Leave blank to use preset defaults for that variable.</p>
            <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
              {ALLOWED_LANDING_THEME_VARS.map((key) => (
                <div key={key} className="grid grid-cols-[1fr_minmax(0,1.2fr)] gap-2 items-center">
                  <span className="font-mono text-[10px] text-muted-foreground truncate">{key}</span>
                  <Input
                    className="h-8 text-xs"
                    value={tokenInputs[key] ?? ""}
                    onChange={(e) => setTokenInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder='e.g. 199 89% 48%'
                  />
                </div>
              ))}
            </div>
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
                <Input
                  type="number"
                  className="mt-1"
                  value={price}
                  onChange={(e) => setPrice(+e.target.value)}
                  min={0}
                />
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
            <Switch checked={isPublished} onCheckedChange={setIsPublished} id="theme-pub" />
            <Label htmlFor="theme-pub">Published</Label>
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

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Preview card</CardTitle>
          <CardDescription>Approximate token preview (public site merges preset + overrides).</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-xl border bg-card p-6 space-y-2"
            style={{
              ...previewStyle,
              background: mergedTokens["--background"] ? `hsl(${mergedTokens["--background"]})` : undefined,
              color: mergedTokens["--foreground"] ? `hsl(${mergedTokens["--foreground"]})` : undefined,
            }}
          >
            <p className="text-lg font-semibold">Hero headline</p>
            <p className="text-sm opacity-80">Body copy uses your foreground and muted tokens.</p>
            <div
              className="inline-block rounded-md px-3 py-1.5 text-sm"
              style={{
                background: mergedTokens["--primary"] ? `hsl(${mergedTokens["--primary"]})` : "hsl(var(--primary))",
                color: mergedTokens["--primary-foreground"]
                  ? `hsl(${mergedTokens["--primary-foreground"]})`
                  : "hsl(var(--primary-foreground))",
              }}
            >
              Primary button
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
