import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Search, RefreshCw, Image, Upload, Loader2 } from "lucide-react";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";

interface SeoSettings {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image_url: string | null;
  og_title: string | null;
  og_description: string | null;
}

interface SiteSettings extends SeoSettings {
  id: string;
}

const RECOMMENDED_OG_SIZE = "1200×630 px";

const AdminSeo = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [ogImageSize, setOgImageSize] = useState<string | null>(null);
  const [ogImageError, setOgImageError] = useState(false);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchTenantId = async (): Promise<string> => {
    const { data } = await supabase.rpc("get_my_tenant_id");
    return data ?? "default";
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, meta_title, meta_description, meta_keywords, og_image_url, og_title, og_description")
      .limit(1)
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setSettings(data as SiteSettings);
    setLoading(false);
  };

  const update = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    if (key === "og_image_url") {
      setOgImageSize(null);
      setOgImageError(false);
    }
  };

  const uploadOgImage = async (rawFile: File) => {
    setUploadingOg(true);
    try {
      const file = await compressImage(rawFile, "og");
      const tenantId = await fetchTenantId();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${tenantId}/og-image-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      update("og_image_url", urlData.publicUrl);
      toast({ title: "OG image uploaded" });
      ogInputRef.current && (ogInputRef.current.value = "");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingOg(false);
  };

  const handleOgImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setOgImageSize(`${img.naturalWidth}×${img.naturalHeight} px`);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from("site_settings")
      .update({
        meta_title: settings.meta_title || "",
        meta_description: settings.meta_description || "",
        meta_keywords: settings.meta_keywords || "",
        og_image_url: settings.og_image_url || null,
        og_title: settings.og_title || null,
        og_description: settings.og_description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      clearSiteSettingsCache();
      toast({ title: "SEO settings saved" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return <p className="p-6 text-muted-foreground">Settings not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" /> SEO
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta tags and Open Graph for search engines and social sharing
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Meta Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta Tags</CardTitle>
            <CardDescription>Shown in search results and browser tabs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Meta Title</Label>
              <Input
                value={settings.meta_title}
                onChange={(e) => update("meta_title", e.target.value)}
                className="mt-1"
                placeholder="e.g. Green Leaf Resort | Luxury Stay in Wayanad"
                maxLength={70}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {settings.meta_title.length}/70 characters (recommended 50–60)
              </p>
            </div>
            <div>
              <Label>Meta Description</Label>
              <Textarea
                value={settings.meta_description}
                onChange={(e) => update("meta_description", e.target.value)}
                className="mt-1 min-h-[80px]"
                placeholder="Brief description for search results..."
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {settings.meta_description.length}/160 characters
              </p>
            </div>
            <div>
              <Label>Meta Keywords (optional)</Label>
              <Input
                value={settings.meta_keywords}
                onChange={(e) => update("meta_keywords", e.target.value)}
                className="mt-1"
                placeholder="resort, wayanad, stay, luxury..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Open Graph */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Graph</CardTitle>
            <CardDescription>Used when sharing links on social media</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-1"><Image className="w-3 h-3" /> OG Image</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Recommended: {RECOMMENDED_OG_SIZE} (1.91:1 ratio)</p>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                {settings.og_image_url ? (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border bg-muted min-h-[140px] w-full max-w-[300px] aspect-[1.91/1] flex items-center justify-center">
                      {ogImageError ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm p-4 text-center">
                          <Image className="h-10 w-10 opacity-50" />
                          <span>Image failed to load. Check URL or upload again.</span>
                        </div>
                      ) : (
                        <img
                          src={settings.og_image_url}
                          alt="OG preview"
                          className="w-full h-full object-cover"
                          onLoad={handleOgImageLoad}
                          onError={() => setOgImageError(true)}
                        />
                      )}
                      {ogImageSize && !ogImageError && (
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {ogImageSize}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => ogInputRef.current?.click()} disabled={uploadingOg}>
                        {uploadingOg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingOg ? " Uploading..." : " Change"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => update("og_image_url", null)}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => ogInputRef.current?.click()}
                    disabled={uploadingOg}
                    className="w-full"
                  >
                    {uploadingOg ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploadingOg ? "Uploading..." : "Upload image"}
                  </Button>
                )}
                <input
                  ref={ogInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadOgImage(e.target.files[0])}
                />
                <Input
                  value={settings.og_image_url || ""}
                  onChange={(e) => update("og_image_url", e.target.value)}
                  className="mt-2 text-xs"
                  placeholder="Or paste image URL"
                />
              </div>
            </div>
            <div>
              <Label>OG Title</Label>
              <Input
                value={settings.og_title || ""}
                onChange={(e) => update("og_title", e.target.value)}
                className="mt-1"
                placeholder="Defaults to meta title if empty"
              />
            </div>
            <div>
              <Label>OG Description</Label>
              <Textarea
                value={settings.og_description || ""}
                onChange={(e) => update("og_description", e.target.value)}
                className="mt-1 min-h-[60px]"
                placeholder="Defaults to meta description if empty"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSeo;
