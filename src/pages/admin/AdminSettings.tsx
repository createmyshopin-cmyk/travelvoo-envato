import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings, Globe, Phone, Mail, MapPin, RefreshCw, Smartphone, Home, Compass, Sparkles, Heart, Palette, Upload, Image, Type, Loader2 } from "lucide-react";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";

interface SiteSettings {
  id: string;
  site_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
  currency: string;
  booking_enabled: boolean;
  maintenance_mode: boolean;
  sticky_menu_enabled: boolean;
  sticky_menu_show_ai: boolean;
  sticky_menu_show_wishlist: boolean;
  sticky_menu_show_explore: boolean;
}

interface TenantBranding {
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [branding, setBranding] = useState<TenantBranding>({
    logo_url: "", favicon_url: "", primary_color: "#6366f1", secondary_color: "#8b5cf6", footer_text: "",
  });
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const [{ data: settingsData }, { data: tenantData }] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).single(),
      supabase.from("tenants").select("*").limit(1).single(),
    ]);
    if (settingsData) setSettings(settingsData as SiteSettings);
    if (tenantData) {
      setTenant(tenantData);
      setBranding({
        logo_url: tenantData.logo_url || "",
        favicon_url: tenantData.favicon_url || "",
        primary_color: tenantData.primary_color || "#6366f1",
        secondary_color: tenantData.secondary_color || "#8b5cf6",
        footer_text: tenantData.footer_text || "",
      });
    }
    setLoading(false);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);

    const { id, ...rest } = settings;
    const [{ error: settingsErr }, { error: brandingErr }] = await Promise.all([
      supabase.from("site_settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id),
      tenant ? supabase.from("tenants").update({
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        footer_text: branding.footer_text,
      }).eq("id", tenant.id) : Promise.resolve({ error: null }),
    ]);

    setSaving(false);
    if (settingsErr || brandingErr) {
      toast({ title: "Error", description: (settingsErr || brandingErr)?.message, variant: "destructive" });
    } else {
      clearSiteSettingsCache(); // ensure public pages pick up the new maintenance_mode value
      toast({ title: "Settings saved" });
    }
  };

  const uploadFile = async (rawFile: File, type: "logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    try {
      const file = await compressImage(rawFile, "branding");
      const ext = file.name.split(".").pop();
      const path = `${tenant?.id || "default"}/${type}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const url = urlData.publicUrl;

      setBranding((b) => ({ ...b, [`${type}_url`]: url }));
      toast({ title: `${type === "logo" ? "Logo" : "Favicon"} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const update = (key: keyof SiteSettings, value: string | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!settings) {
    return <p className="p-6 text-muted-foreground">Settings not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage site-wide configuration and branding</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Site Name</Label>
              <Input value={settings.site_name} onChange={(e) => update("site_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={settings.currency} onChange={(e) => update("currency", e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Booking Enabled</Label>
              <Switch checked={settings.booking_enabled} onCheckedChange={(v) => update("booking_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Maintenance Mode</Label>
              <Switch checked={settings.maintenance_mode} onCheckedChange={(v) => update("maintenance_mode", v)} />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <Input value={settings.contact_email} onChange={(e) => update("contact_email", e.target.value)} className="mt-1" placeholder="hello@stayfinder.com" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input value={settings.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} className="mt-1" placeholder="+91 9876543210" />
            </div>
            <div>
              <Label>WhatsApp Number</Label>
              <Input value={settings.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} className="mt-1" placeholder="+919876543210" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
              <Input value={settings.address} onChange={(e) => update("address", e.target.value)} className="mt-1" placeholder="Wayanad, Kerala" />
            </div>
          </CardContent>
        </Card>

        {/* White-Label Branding */}
        <Card className="md:col-span-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> White-Label Branding</CardTitle>
            <CardDescription>Customize your resort's visual identity across all pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Logo Upload */}
              <div>
                <Label className="flex items-center gap-1 mb-2"><Image className="w-3 h-3" /> Logo</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {branding.logo_url ? (
                    <div className="space-y-2">
                      <img src={branding.logo_url} alt="Logo" className="max-h-16 mx-auto object-contain" />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        Change Logo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full"
                    >
                      {uploadingLogo ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-1" /> Upload Logo</>
                      )}
                    </Button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "logo")}
                  />
                </div>
                <Input
                  value={branding.logo_url}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  className="mt-2 text-xs"
                  placeholder="Or paste logo URL"
                />
              </div>

              {/* Favicon Upload */}
              <div>
                <Label className="flex items-center gap-1 mb-2"><Image className="w-3 h-3" /> Favicon</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {branding.favicon_url ? (
                    <div className="space-y-2">
                      <img src={branding.favicon_url} alt="Favicon" className="max-h-10 mx-auto object-contain" />
                      <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                        Change Favicon
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="w-full"
                    >
                      {uploadingFavicon ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-1" /> Upload Favicon</>
                      )}
                    </Button>
                  )}
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "favicon")}
                  />
                </div>
                <Input
                  value={branding.favicon_url}
                  onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                  className="mt-2 text-xs"
                  placeholder="Or paste favicon URL"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-md border cursor-pointer"
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="font-mono"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded-md border cursor-pointer"
                  />
                  <Input
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    className="font-mono"
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div>
              <Label className="flex items-center gap-1 mb-2"><Type className="w-3 h-3" /> Footer Text</Label>
              <Input
                value={branding.footer_text}
                onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
                placeholder="© 2026 Green Leaf Resort. All rights reserved."
              />
            </div>

            {/* Live Preview */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Brand Preview</p>
              <div className="bg-muted rounded-xl p-4">
                <div className="bg-background rounded-lg shadow-sm border overflow-hidden">
                  {/* Header Preview */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    <div className="flex items-center gap-2">
                      {branding.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="h-6 object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-white/20" />
                      )}
                      <span className="text-white font-semibold text-sm">
                        {settings.site_name || "Your Resort"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-12 h-2 rounded bg-white/30" />
                      <div className="w-12 h-2 rounded bg-white/30" />
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <button
                      className="mt-2 px-4 py-1.5 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: branding.primary_color }}
                    >
                      Book Now
                    </button>
                  </div>

                  {/* Footer Preview */}
                  <div
                    className="px-4 py-2 text-xs text-center"
                    style={{ backgroundColor: branding.secondary_color, color: "white" }}
                  >
                    {branding.footer_text || `© ${new Date().getFullYear()} ${settings.site_name}`}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky Menu Settings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4" /> Sticky Bottom Menu</CardTitle>
            <CardDescription>Configure the mobile bottom navigation bar shown on the homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <Label>Enable Sticky Menu</Label>
              </div>
              <Switch checked={settings.sticky_menu_enabled} onCheckedChange={(v) => update("sticky_menu_enabled", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-muted-foreground" />
                <Label>Show Explore</Label>
              </div>
              <Switch checked={settings.sticky_menu_show_explore} onCheckedChange={(v) => update("sticky_menu_show_explore", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <Label>Show AI Search Button</Label>
              </div>
              <Switch checked={settings.sticky_menu_show_ai} onCheckedChange={(v) => update("sticky_menu_show_ai", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <Label>Show Wishlist</Label>
              </div>
              <Switch checked={settings.sticky_menu_show_wishlist} onCheckedChange={(v) => update("sticky_menu_show_wishlist", v)} />
            </div>

            {/* Live Preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview</p>
              <div className="bg-muted rounded-xl p-3">
                <div className="bg-background rounded-lg shadow-sm border border-border">
                  <div className="flex items-end justify-around h-[60px] px-2 pb-2 pt-1 relative">
                    <div className="flex flex-col items-center">
                      <Home className="w-5 h-5 text-primary" />
                      <span className="text-[9px] text-primary font-medium">Home</span>
                    </div>
                    {settings.sticky_menu_show_explore && (
                      <div className="flex flex-col items-center">
                        <Compass className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">Explore</span>
                      </div>
                    )}
                    {settings.sticky_menu_show_ai && (
                      <div className="flex flex-col items-center -mt-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] text-primary font-medium">AI Search</span>
                      </div>
                    )}
                    {settings.sticky_menu_show_wishlist && (
                      <div className="flex flex-col items-center">
                        <Heart className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">Wishlist</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Social Media</CardTitle>
            <CardDescription>Links to your social profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Instagram</Label>
                <Input value={settings.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} className="mt-1" placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input value={settings.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} className="mt-1" placeholder="https://facebook.com/..." />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input value={settings.social_youtube} onChange={(e) => update("social_youtube", e.target.value)} className="mt-1" placeholder="https://youtube.com/..." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
