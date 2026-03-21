"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Store } from "lucide-react";
import { ThemeEditorProvider, ThemeHeroSection, ThemePreviewSection } from "@/components/admin/ThemeEditorPanel";
import {
  ALLOWED_LANDING_THEME_VARS,
  type LandingThemePreset,
  isLandingThemePreset,
  normalizeThemeTokens,
} from "@/lib/marketplace-theme";
import { cn } from "@/lib/utils";
import { hexToHslSpaceString, pickerHexForTokenValue } from "@/lib/theme-token-color";
import type { Json } from "@/integrations/supabase/types";

const PRESET_OPTIONS: { id: LandingThemePreset; label: string; hint: string }[] = [
  { id: "default", label: "Default", hint: "Neutral base" },
  { id: "ocean", label: "Ocean", hint: "Cool blues" },
  { id: "sunset", label: "Sunset", hint: "Warm coral" },
  { id: "forest", label: "Forest", hint: "Natural greens" },
  { id: "plannet", label: "Plannet", hint: "Resort green & monochrome" },
];

export default function AdminTheme() {
  const router = useRouter();
  const { plan, loading: planLoading } = useSubscriptionGuard();
  const marketplaceEnabled = !!(plan?.feature_flags as Record<string, boolean> | undefined)?.marketplace;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [preset, setPreset] = useState<LandingThemePreset>("default");
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [savedPreset, setSavedPreset] = useState<LandingThemePreset>("default");
  const [savedTokens, setSavedTokens] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tid } = await supabase.rpc("get_my_tenant_id");

    let siteRes = tid
      ? await (supabase.from("site_settings") as any).select("id, landing_theme_slug, theme_tokens").eq("tenant_id", tid).maybeSingle()
      : { data: null as { id: string; landing_theme_slug: string | null; theme_tokens: Json | null } | null };

    if (!siteRes.data?.id) {
      siteRes = await supabase.from("site_settings").select("id, landing_theme_slug, theme_tokens").limit(1).maybeSingle();
    }

    const row = siteRes.data as { id: string; landing_theme_slug: string | null; theme_tokens: Json | null } | null;

    if (row?.id) {
      setSiteId(row.id);
      const slug = row.landing_theme_slug;
      setPreset(isLandingThemePreset(slug) ? slug : "default");
      const normalized = normalizeThemeTokens(row.theme_tokens);
      const inputs: Record<string, string> = {};
      for (const k of ALLOWED_LANDING_THEME_VARS) {
        if (normalized[k]) inputs[k] = normalized[k];
      }
      setTokenInputs(inputs);
      setSavedPreset(isLandingThemePreset(slug) ? slug : "default");
      setSavedTokens({ ...inputs });
    } else {
      setSiteId(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!planLoading) load();
  }, [planLoading, load]);

  const save = async () => {
    if (!siteId) {
      toast({ title: "Settings not found", description: "Could not load site settings.", variant: "destructive" });
      return;
    }

    const tokens: Record<string, string> = {};
    for (const key of ALLOWED_LANDING_THEME_VARS) {
      const v = (tokenInputs[key] ?? "").trim();
      if (v) tokens[key] = v;
    }

    setSaving(true);
    const { error } = await (supabase.from("site_settings") as any)
      .update({
        landing_theme_slug: preset,
        theme_tokens: Object.keys(tokens).length ? tokens : {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", siteId);

    setSaving(false);

    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    clearSiteSettingsCache();
    setSavedPreset(preset);
    setSavedTokens({ ...tokens });
    toast({ title: "Theme saved", description: "Your public landing page will reflect these settings." });
  };

  const themeDirty = useMemo(() => {
    if (loading) return false;
    if (preset !== savedPreset) return true;
    for (const k of ALLOWED_LANDING_THEME_VARS) {
      if ((tokenInputs[k] ?? "").trim() !== (savedTokens[k] ?? "").trim()) return true;
    }
    return false;
  }, [loading, preset, savedPreset, tokenInputs, savedTokens]);

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-7 w-7 text-primary" />
          Theme
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preset and colors update the live preview instantly. Save to apply on your public site. Hero slides and images can be edited below.
        </p>
      </div>

      <ThemeEditorProvider>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Landing page preset</CardTitle>
          <CardDescription>Built-in styles for your site shell. Optional color overrides apply on top of the preset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  preset === p.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/50"
                )}
              >
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.hint}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <Label className="text-base">Color tokens (optional)</Label>
            <p className="text-xs text-muted-foreground">Leave blank to use preset defaults only.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ALLOWED_LANDING_THEME_VARS.map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key} className="text-xs font-mono text-muted-foreground">
                    {key}
                  </Label>
                  {key === "--radius" ? (
                    <Input
                      id={key}
                      placeholder="e.g. 0.5rem"
                      value={tokenInputs[key] ?? ""}
                      onChange={(e) => setTokenInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        className="min-w-0 flex-1 font-mono text-sm"
                        placeholder="e.g. 199 89% 48%"
                        value={tokenInputs[key] ?? ""}
                        onChange={(e) => setTokenInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                      <input
                        type="color"
                        aria-label={`Pick color for ${key}`}
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
                        value={pickerHexForTokenValue(tokenInputs[key] ?? "")}
                        onChange={(e) =>
                          setTokenInputs((prev) => ({ ...prev, [key]: hexToHslSpaceString(e.target.value) }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={save} disabled={saving || !siteId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save theme"}
          </Button>
        </CardContent>
      </Card>

      <ThemePreviewSection preset={preset} tokenInputs={tokenInputs} themeDirty={themeDirty} />
      </div>

      <ThemeHeroSection />

      </ThemeEditorProvider>

      {marketplaceEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5" />
              Marketplace themes
            </CardTitle>
            <CardDescription>Install catalog themes and activate them from the Marketplace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => router.push("/admin/marketplace")}>
              Open Marketplace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
