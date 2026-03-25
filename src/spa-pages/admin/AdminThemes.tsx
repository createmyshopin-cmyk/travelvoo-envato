"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Package } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MarketplaceItem = Tables<"marketplace_items">;

type Manifest = {
  preset?: string;
  tokens?: Record<string, string>;
  plugin_key?: string;
  layout?: string;
};

function parseManifest(raw: unknown): Manifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Manifest;
}

const PRESET_THUMB_GRADIENT: Record<string, string> = {
  default: "from-slate-300 via-slate-400 to-slate-600 dark:from-slate-600 dark:via-slate-700 dark:to-slate-900",
  ocean: "from-cyan-400 via-blue-500 to-indigo-700 dark:from-cyan-800 dark:via-blue-900 dark:to-indigo-950",
  sunset: "from-amber-300 via-orange-500 to-rose-700 dark:from-amber-800 dark:via-rose-900 dark:to-rose-950",
  forest: "from-emerald-400 via-green-600 to-emerald-900 dark:from-emerald-800 dark:via-green-900 dark:to-emerald-950",
  plannet: "from-emerald-700 via-slate-800 to-zinc-950",
};

function MarketplaceItemThumbnail({ item, manifest }: { item: MarketplaceItem; manifest: Manifest }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = item.preview_image_url?.trim();
  const preset = manifest.preset ?? "default";
  const grad = PRESET_THUMB_GRADIENT[preset] ?? PRESET_THUMB_GRADIENT.default;

  if (url && !imgFailed) {
    return (
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted border-b">
        <img
          src={url}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b bg-gradient-to-br flex items-center justify-center",
        grad
      )}
    >
      <Palette className="h-14 w-14 text-white/95 drop-shadow-md" aria-hidden />
      <span className="absolute bottom-2 left-2 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {preset}
      </span>
    </div>
  );
}

export default function AdminThemes() {
  const router = useRouter();
  const { plan, loading: planLoading } = useSubscriptionGuard();
  const marketplaceEnabled = !!(plan?.feature_flags as Record<string, boolean> | undefined)?.marketplace;

  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<MarketplaceItem[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeThemeSlug, setActiveThemeSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    setTenantId(tid ?? null);

    if (tid) {
      // 1. Get active theme from site_settings
      let siteRes = await (supabase.from("site_settings") as any).select("id, landing_theme_slug").eq("tenant_id", tid).maybeSingle();
      if (!siteRes.data?.id) {
        siteRes = await supabase.from("site_settings").select("id, landing_theme_slug").limit(1).maybeSingle();
      }
      setActiveThemeSlug(siteRes.data?.landing_theme_slug || "default");

      // 2. Get installed themes from marketplace
      const { data: installedItems } = await supabase
        .from("tenant_marketplace_installs")
        .select("status, item:marketplace_items(*)")
        .eq("tenant_id", tid);

      if (installedItems) {
        const installedThemes = (installedItems as any[])
          .filter(install => install.status === "installed" && install.item?.type === "theme")
          .map(install => install.item as MarketplaceItem);
        setThemes(installedThemes);
      }
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!planLoading && marketplaceEnabled) load();
    if (!planLoading && !marketplaceEnabled) setLoading(false);
  }, [planLoading, marketplaceEnabled, load]);

  const handleActivateTheme = async (item: MarketplaceItem) => {
    if (!tenantId) return;

    const manifest = parseManifest(item.manifest);
    const preset = manifest.preset ?? "default";
    const tokens = manifest.tokens ?? {};

    setBusyId(item.id);
    let siteRes = await (supabase.from("site_settings") as any).select("id").eq("tenant_id", tenantId).maybeSingle();
    if (!siteRes.data?.id) {
      siteRes = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
    }
    const site = siteRes.data as { id: string } | null;
    const siteErr = siteRes.error;

    if (siteErr || !site?.id) {
      setBusyId(null);
      toast({ title: "Settings not found", description: siteErr?.message ?? "Missing site_settings row.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("site_settings")
      .update({
        landing_theme_slug: preset,
        theme_tokens: tokens,
        updated_at: new Date().toISOString(),
      })
      .eq("id", site.id);

    setBusyId(null);

    if (error) {
      toast({ title: "Could not apply theme", description: error.message, variant: "destructive" });
      return;
    }
    
    clearSiteSettingsCache();
    setActiveThemeSlug(preset);
    toast({ title: "Theme active", description: "Your public site will now use this theme." });
  };

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!marketplaceEnabled) {
    return (
      <div className="space-y-4 max-w-md mx-auto text-center py-12">
        <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Themes</h1>
        <p className="text-sm text-muted-foreground">Theming is not included in your current plan.</p>
        <Button onClick={() => router.push("/admin/account/billing")}>View plans</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-7 w-7 text-primary" />
            Installed Themes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Activate installed themes for your property site.</p>
        </div>
        <Button onClick={() => router.push("/admin/theme-editor")} variant="outline" className="hidden sm:flex">
          Edit Active Theme
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You haven't installed any themes yet.
              <div className="mt-4">
                <Button variant="secondary" onClick={() => router.push("/admin/marketplace")}>Browse Marketplace</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          themes.map((item) => {
            const manifest = parseManifest(item.manifest);
            const preset = manifest.preset ?? "default";
            const isActive = activeThemeSlug === preset;
            
            return (
              <Card key={item.id} className={cn("flex flex-col overflow-hidden pt-0 transition-colors", isActive && "border-primary ring-1 ring-primary/30 bg-primary/5")}>
                <MarketplaceItemThumbnail item={item} manifest={manifest} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Palette className="h-5 w-5 shrink-0 text-primary" />
                      <CardTitle className="text-base truncate">{item.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3">{item.description || "—"}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="text-xs flex flex-wrap gap-2">
                    {isActive ? (
                      <Badge variant="default" className="bg-primary/90">Active Theme</Badge>
                    ) : (
                      <Badge variant="outline">Installed</Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {isActive ? (
                      <Button className="w-full" size="sm" onClick={() => router.push("/admin/theme-editor")}>
                        Configure Theme
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        size="sm" 
                        variant="secondary" 
                        disabled={busyId === item.id} 
                        onClick={() => handleActivateTheme(item)}
                      >
                        {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate on site"}
                      </Button>
                    )}
                  </div>
                  {manifest.preset && (
                    <p className="text-[10px] text-muted-foreground">Preset: {manifest.preset}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
