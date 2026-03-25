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
import { Loader2, Lock, Package, Palette, Store, Eye } from "lucide-react";
import { payForMarketplaceItem } from "@/lib/marketplace-checkout";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type MarketplaceItem = Tables<"marketplace_items">;
type TenantInstall = Tables<"tenant_marketplace_installs">;

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

/** Fallback gradients when `preview_image_url` is empty (matches theme presets). */
const PRESET_THUMB_GRADIENT: Record<string, string> = {
  default: "from-slate-300 via-slate-400 to-slate-600 dark:from-slate-600 dark:via-slate-700 dark:to-slate-900",
  ocean: "from-cyan-400 via-blue-500 to-indigo-700 dark:from-cyan-800 dark:via-blue-900 dark:to-indigo-950",
  sunset: "from-amber-300 via-orange-500 to-rose-700 dark:from-amber-800 dark:via-rose-900 dark:to-rose-950",
  forest: "from-emerald-400 via-green-600 to-emerald-900 dark:from-emerald-800 dark:via-green-900 dark:to-emerald-950",
  plannet: "from-emerald-700 via-slate-800 to-zinc-950",
};

function MarketplaceItemThumbnail({
  item,
  manifest,
  isTheme,
}: {
  item: MarketplaceItem;
  manifest: Manifest;
  isTheme: boolean;
}) {
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

  if (isTheme) {
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

  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b bg-gradient-to-br from-violet-400 via-purple-600 to-slate-800 flex items-center justify-center">
      <Package className="h-14 w-14 text-white/95 drop-shadow-md" aria-hidden />
    </div>
  );
}

export default function AdminMarketplace() {
  const router = useRouter();
  const { plan, loading: planLoading } = useSubscriptionGuard();
  const marketplaceEnabled = !!(plan?.feature_flags as Record<string, boolean> | undefined)?.marketplace;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [installs, setInstalls] = useState<TenantInstall[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeThemeSlug, setActiveThemeSlug] = useState<string | null>(null);
  const [tenantContact, setTenantContact] = useState<{ name: string; email: string; phone: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tid } = await supabase.rpc("get_my_tenant_id");
    setTenantId(tid ?? null);

    if (tid) {
      const { data: trow } = await supabase.from("tenants").select("tenant_name, email, phone").eq("id", tid).single();
      if (trow) {
        setTenantContact({
          name: trow.tenant_name || "Property",
          email: trow.email || "",
          phone: trow.phone || "",
        });
      } else setTenantContact(null);
    } else setTenantContact(null);

    const [cat, ins] = await Promise.all([
      supabase.from("marketplace_items").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
      tid
        ? supabase.from("tenant_marketplace_installs").select("*").eq("tenant_id", tid)
        : { data: [] as TenantInstall[] },
    ]);

    if (tid) {
      let siteRes = await (supabase.from("site_settings") as any).select("landing_theme_slug").eq("tenant_id", tid).maybeSingle();
      if (!siteRes.data) {
        siteRes = await supabase.from("site_settings").select("landing_theme_slug").limit(1).maybeSingle();
      }
      setActiveThemeSlug(siteRes.data?.landing_theme_slug || "default");
    }

    if (cat.data) setItems(cat.data as MarketplaceItem[]);
    if (ins.data) setInstalls(ins.data as TenantInstall[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!planLoading && marketplaceEnabled) load();
    if (!planLoading && !marketplaceEnabled) setLoading(false);
  }, [planLoading, marketplaceEnabled, load]);

  const installRow = (itemId: string) => installs.find((i) => i.item_id === itemId);

  const isFreeItem = (item: MarketplaceItem) =>
    item.pricing_model === "free" || (item.pricing_model === "one_time" && Number(item.price) === 0);

  const handleInstall = async (item: MarketplaceItem) => {
    if (!tenantId) {
      toast({ title: "No tenant", description: "Could not resolve tenant.", variant: "destructive" });
      return;
    }
    setBusyId(item.id);
    const { error } = await supabase.from("tenant_marketplace_installs").upsert(
      {
        tenant_id: tenantId,
        item_id: item.id,
        status: "installed",
        config: {},
      },
      { onConflict: "tenant_id,item_id", ignoreDuplicates: false }
    );
    setBusyId(null);

    if (error) {
      toast({ title: "Install failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Installed", description: item.name });
    await load();
  };

  const handleUninstall = async (item: MarketplaceItem, isActive: boolean) => {
    if (!tenantId) return;
    if (!confirm(`Are you sure you want to uninstall ${item.name}?`)) return;

    setBusyId(item.id);
    const { error } = await supabase
      .from("tenant_marketplace_installs")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("item_id", item.id);

    // If the theme was active, automatically revert the user's site back to the default theme
    if (isActive && !error) {
       let siteRes = await (supabase.from("site_settings") as any).select("id").eq("tenant_id", tenantId).maybeSingle();
       if (!siteRes.data?.id) siteRes = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
       
       if (siteRes.data?.id) {
          await supabase.from("site_settings").update({
             landing_theme_slug: "default",
             theme_tokens: {},
             updated_at: new Date().toISOString()
          }).eq("id", siteRes.data.id);
          clearSiteSettingsCache();
       }
    }

    setBusyId(null);
    if (error) {
      toast({ title: "Uninstall failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Uninstalled", description: isActive ? `${item.name} removed and site reverted to default theme.` : `${item.name} has been removed.` });
      await load();
    }
  };

  const handlePayAndInstall = (item: MarketplaceItem) => {
    if (!tenantId || !tenantContact) {
      toast({ title: "Missing tenant", description: "Could not load tenant profile for checkout.", variant: "destructive" });
      return;
    }
    setBusyId(item.id);
    payForMarketplaceItem(item.id, {
      tenantName: tenantContact.name,
      email: tenantContact.email,
      phone: tenantContact.phone,
      onSuccess: async () => {
        setBusyId(null);
        toast({ title: "Payment successful", description: item.name });
        await load();
      },
      onError: (msg) => {
        setBusyId(null);
        toast({ title: "Payment", description: msg, variant: "destructive" });
      },
    });
  };

  const handleActivateTheme = async (item: MarketplaceItem) => {
    if (!tenantId) return;
    const row = installRow(item.id);
    if (!row || row.status !== "installed") {
      toast({ title: "Install first", description: "Install this theme before activating.", variant: "destructive" });
      return;
    }

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
    toast({ title: "Theme active", description: "Your public site will use this theme." });
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
        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-semibold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Marketplace is not included in your current plan.</p>
        <Button onClick={() => router.push("/admin/account/billing")}>View plans</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-7 w-7 text-primary" />
          Marketplace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Install themes and plugins for your property site.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No published items yet. Your platform admin can add themes and plugins from SaaS admin.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const installed = installRow(item.id);
            const isTheme = item.type === "theme";
            const free = isFreeItem(item);
            const manifest = parseManifest(item.manifest);
            
            // For themes, check if it's currently the active one
            const isActiveTheme = isTheme && (manifest.preset ?? "default") === activeThemeSlug;

            return (
              <Card key={item.id} className="flex flex-col overflow-hidden pt-0">
                <MarketplaceItemThumbnail item={item} manifest={manifest} isTheme={isTheme} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isTheme ? <Palette className="h-5 w-5 shrink-0 text-primary" /> : <Package className="h-5 w-5 shrink-0 text-secondary" />}
                      <CardTitle className="text-base truncate">{item.name}</CardTitle>
                    </div>
                    <Badge variant={item.type === "theme" ? "default" : "secondary"} className="shrink-0">
                      {item.type}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3">{item.description || "—"}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                    {free ? (
                      <Badge variant="outline">Free</Badge>
                    ) : (
                      <Badge variant="outline">
                        {item.pricing_model === "recurring"
                          ? `${item.currency} ${item.price}/${item.billing_interval ?? "mo"}`
                          : `${item.currency} ${item.price}`}
                      </Badge>
                    )}
                    {installed?.status === "installed" && <Badge>Installed</Badge>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {!installed && free && (
                      <Button
                        className="w-full sm:flex-1"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => handleInstall(item)}
                      >
                        {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Install"}
                      </Button>
                    )}
                    {!installed && !free && (
                      <Button
                        className="w-full sm:flex-1"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => handlePayAndInstall(item)}
                      >
                        {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay & install"}
                      </Button>
                    )}
                    {installed?.status === "installed" && isTheme && (
                      <Button className="w-full sm:flex-1" size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => handleActivateTheme(item)}>
                        {busyId === item.id && !isActiveTheme ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate on site"}
                      </Button>
                    )}
                    {installed?.status === "installed" && (
                      <Button 
                        className="w-full sm:flex-1" 
                        size="sm" 
                        variant="ghost" 
                        disabled={busyId === item.id} 
                        onClick={() => handleUninstall(item, isActiveTheme)}
                      >
                        Uninstall
                      </Button>
                    )}
                    {isTheme && (
                      <Button 
                        className="w-full sm:flex-1" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => router.push(`/admin/marketplace/preview/${item.slug}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Preview
                      </Button>
                    )}
                  </div>
                  {isTheme && manifest.preset && (
                    <p className="text-[10px] text-muted-foreground">Preset: {manifest.preset}</p>
                  )}
                  {!isTheme && manifest.plugin_key && (
                    <p className="text-[10px] text-muted-foreground">Plugin: {manifest.plugin_key}</p>
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
