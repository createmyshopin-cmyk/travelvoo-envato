"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Palette, CheckCircle2, Search, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type MarketplaceItem = Tables<"marketplace_items">;

type ThemeConfig = {
  item: MarketplaceItem;
  tokens: Record<string, string>;
};

export default function AdminThemePreview({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { slug } = params;
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ThemeConfig | null>(null);

  const loadTheme = useCallback(async () => {
    try {
      const { data: itemData, error: dbError } = await supabase
        .from("marketplace_items")
        .select("*")
        .eq("slug", slug)
        .eq("type", "theme")
        .single();
        
      if (dbError || !itemData) throw new Error("Theme not found in marketplace.");

      // For public marketplace items, the manifest contains the already parsed tokens!
      const manifestRaw = itemData.manifest;
      let parsedTokens = {};
      if (manifestRaw && typeof manifestRaw === "object" && !Array.isArray(manifestRaw)) {
         parsedTokens = (manifestRaw as any).tokens || {};
      }

      setConfig({ item: itemData, tokens: parsedTokens });
    } catch (err: any) {
      toast({ title: "Preview Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load preview for {slug}</p>
        <Button variant="link" onClick={() => router.push("/admin/marketplace")}>Go back to Marketplace</Button>
      </div>
    );
  }

  // Inject CSS variables strictly to the sandbox wrapper
  const styleVariables = Object.entries(config.tokens).reduce((acc, [key, val]) => {
    acc[`--${key}`] = val;
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/marketplace")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Sandbox Preview: {config.item.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualizing this theme's architecture and layout flow dynamically.
          </p>
        </div>
      </div>

      <div 
        className="w-full border rounded-xl overflow-hidden bg-background shadow-lg transition-colors duration-500"
        style={styleVariables}
      >
        {/* Sandbox Navigation Mock */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <Palette className="h-5 w-5" /> {config.item.name} Travel
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground">
            <span className="text-primary border-b-2 border-primary py-1">Home</span>
            <span className="hover:text-primary cursor-pointer">Destinations</span>
            <span className="hover:text-primary cursor-pointer">Tours</span>
            <span className="hover:text-primary cursor-pointer">Hotels</span>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-foreground">Log In</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Sign Up</Button>
          </div>
        </header>

        {/* Sandbox Hero Mock */}
        <section className="bg-secondary text-secondary-foreground py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
            <Badge variant="outline" className="bg-background text-foreground border-primary/20">
              v{config.item.version} Theme Sandbox
            </Badge>
            <h1 className="text-5xl font-extrabold tracking-tight">
              Discover the World with <span className="text-primary">{config.item.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              This preview applies the uploaded tokens onto generic structures.
              Tailwind classes like `bg-primary` automatically resolve to <code className="px-1 text-xs">{config.tokens.primary || "--"}</code>.
            </p>

            {/* Mock Search Tool */}
            <div className="mt-8 bg-background p-3 rounded-lg shadow-soft flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto border">
              <div className="flex-1 flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Where to?</span>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">When?</span>
              </div>
              <Button size="lg" className="w-full flex items-center justify-center sm:w-auto px-8 gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </div>
        </section>

        {/* Sandbox Content Mock */}
        <section className="py-16 px-6 bg-background text-foreground">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Configured Colors & Styles</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Primary", bgClass: "bg-primary", textClass: "text-primary-foreground" },
                { label: "Secondary", bgClass: "bg-secondary", textClass: "text-secondary-foreground" },
                { label: "Accent", bgClass: "bg-accent", textClass: "text-accent-foreground" },
                { label: "Muted", bgClass: "bg-muted", textClass: "text-muted-foreground" },
              ].map((swatch, i) => (
                <Card key={i} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                  <div className={`h-24 w-full flex items-center justify-center ${swatch.bgClass} ${swatch.textClass}`}>
                    <span className="font-semibold shadow-sm">{swatch.label}</span>
                  </div>
                  <CardContent className="p-4 bg-background text-sm">
                    <p className="font-medium text-foreground">Class: {swatch.bgClass}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      Token: {config.tokens[swatch.label.toLowerCase()] || "N/A"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 p-8 bg-muted rounded-xl flex items-start gap-4 border">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Live Theme Injection</h3>
                <p className="text-sm text-muted-foreground">
                  The tenant marketplace preview instantly maps the theme's JSON payload onto live Next.js elements using dynamic inline CSS variables. Once installed and activated, this same mapping structure governs the actual travel application!
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
