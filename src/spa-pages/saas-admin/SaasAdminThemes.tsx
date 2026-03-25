"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Palette, Eye, Trash2, Globe } from "lucide-react";

type Theme = {
  id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  preview: string;
  theme_path: string;
  created_at: string;
};

export default function SaasAdminThemes() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("themes").select("*").order("created_at", { ascending: false });
    if (data) setThemes(data as Theme[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeTheme = async (id: string) => {
    if (!confirm("Are you sure you want to delete this theme? It will be removed from all tenants.")) return;
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) {
       toast({ title: "Error deleting theme", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Theme deleted successfully" });
       load();
    }
  };

  const handlePublishTheme = async (theme: Theme) => {
    setPublishingId(theme.id);
    
    // Fetch tokens.json from storage
    const { data: tokenData, error: storageError } = await supabase.storage
      .from("themes")
      .download(`${theme.theme_path}/styles/tokens.json`);

    let parsedTokens = {};
    if (tokenData) {
      try {
         const text = await tokenData.text();
         parsedTokens = JSON.parse(text);
      } catch(e) {}
    }

    const manifest = {
      preset: theme.slug,
      tokens: parsedTokens,
      layout: "default"
    };

    const { error } = await supabase.from("marketplace_items").upsert(
      {
        type: "theme",
        slug: theme.slug,
        name: theme.name,
        description: theme.description || "",
        version: theme.version,
        is_published: true,
        pricing_model: "free",
        price: 0,
        currency: "USD",
        manifest,
        preview_image_url: theme.preview,
        package_storage_path: theme.theme_path,
        updated_at: new Date().toISOString()
      },
      { onConflict: "slug" }
    );

    setPublishingId(null);

    if (error) {
      toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Published to Marketplace", description: `${theme.name} is now available for all tenants.` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-7 w-7 text-primary" />
            Theme Ecosystem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage global themes, preview sandboxes, and developers tools.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={() => router.push("/saas-admin/themes/docs")} variant="secondary">
              Developer Docs
           </Button>
           <Button onClick={() => router.push("/saas-admin/themes/upload")}>
              Upload Theme ZIP
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No themes available in the ecosystem yet. Upload your first theme!
            </CardContent>
          </Card>
        ) : (
          themes.map((theme) => (
            <Card key={theme.id} className="flex flex-col overflow-hidden pt-0 animate-fade-in shadow-soft">
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted border-b">
                <img
                  src={theme.preview || "https://placehold.co/600x400?text=No+Preview"}
                  alt={theme.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CardTitle className="text-lg truncate">{theme.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="shrink-0 bg-secondary/10">v{theme.version}</Badge>
                </div>
                <CardDescription className="line-clamp-2 h-10">{theme.description || "No description provided."}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-y-1">
                  <div><span className="font-semibold text-foreground">Author:</span> {theme.author}</div>
                  <div><span className="font-semibold text-foreground">Slug:</span> {theme.slug}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button 
                    className="col-span-2" 
                    size="sm" 
                    onClick={() => handlePublishTheme(theme)}
                    disabled={publishingId === theme.id}
                  >
                    {publishingId === theme.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4 mr-2" />
                    )} 
                    Publish to Tenant Marketplace
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/saas-admin/themes/preview/${theme.slug}`)}>
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeTheme(theme.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
