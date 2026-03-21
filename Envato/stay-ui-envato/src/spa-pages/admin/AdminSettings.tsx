import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings, Globe, Phone, Mail, MapPin, RefreshCw, Smartphone, Home, Compass, Sparkles, Heart, Palette, Upload, Image, Type, Loader2, Trash2, Clapperboard, CalendarDays } from "lucide-react";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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
  sticky_menu_show_reels: boolean;
  menu_popup_enabled: boolean;
  menu_popup_title: string;
  best_features_enabled: boolean;
  best_features_title: string;
  coupon_banner_enabled: boolean;
  ga_id: string;
  fb_pixel_id: string;
  clarity_id: string;
  gcal_webhook_url: string;
  gcal_calendar_id: string;
  gcal_enabled: boolean;
}

interface TenantBranding {
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
}

interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

interface PopupSettings {
  enabled: boolean;
  title: string;
  message: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  delay_seconds: number;
  show_once: boolean;
  coupon_code: string;
  template_type: "lead" | "coupon" | "offer" | "stats" | "announcement";
  subtitle: string;
  stats_text: string;
  primary_color: string;
  background_color: string;
}

interface FeatureItem {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  active: boolean;
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
  const [uploadingPromoImage, setUploadingPromoImage] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const promoImageInputRef = useRef<HTMLInputElement>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [popupSettings, setPopupSettings] = useState<PopupSettings | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const [{ data: settingsData }, { data: tenantData }] = await Promise.all([
      supabase.from("site_settings").select("*").limit(1).single(),
      tenantId ? supabase.from("tenants").select("*").eq("id", tenantId).single() : Promise.resolve({ data: null }),
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
    await fetchMarketing();
    setLoading(false);
  };

  const fetchMarketing = async () => {
    setLoadingMarketing(true);
    try {
      const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
      if (!tenantId) {
        setLoadingMarketing(false);
        return;
      }

      const [{ data: menu }, { data: popup }, { data: feats }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true }),
        supabase.from("popup_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("property_features").select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true }),
      ]);

      setMenuItems((menu || []) as MenuItem[]);
      if (popup) {
        const {
          enabled,
          title,
          message,
          cta_text,
          cta_link,
          image_url,
          delay_seconds,
          show_once,
          coupon_code,
          template_type,
          subtitle,
          stats_text,
          primary_color,
          background_color,
        } = popup;
        setPopupSettings({
          enabled,
          title,
          message,
          cta_text,
          cta_link,
          image_url,
          delay_seconds,
          show_once,
          coupon_code,
          template_type: (template_type || "lead") as PopupSettings["template_type"],
          subtitle: subtitle || "",
          stats_text: stats_text || "",
          primary_color: primary_color || "",
          background_color: background_color || "",
        });
      } else {
        setPopupSettings({
          enabled: false,
          title: "",
          message: "",
          cta_text: "Book Now",
          cta_link: "",
          image_url: "",
          delay_seconds: 3,
          show_once: true,
          coupon_code: "",
          template_type: "lead",
          subtitle: "",
          stats_text: "",
          primary_color: "",
          background_color: "",
        });
      }
      setFeatures((feats || []) as FeatureItem[]);
    } finally {
      setLoadingMarketing(false);
    }
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);

    const { id, ...rest } = settings;
    const [{ error: settingsErr }, { error: brandingErr }] = await Promise.all([
      (supabase.from("site_settings") as any).update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id),
      tenant ? supabase.from("tenants").update({
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        footer_text: branding.footer_text,
      }).eq("id", tenant.id) : Promise.resolve({ error: null }),
    ]);

    let popupErr: { message?: string } | null = null;
    if (popupSettings) {
      const tenantId = tenant?.id || (await supabase.rpc("get_my_tenant_id")).data;
      if (tenantId) {
        const { error } = await supabase
          .from("popup_settings")
          .upsert(
            {
              tenant_id: tenantId,
              enabled: popupSettings.enabled,
              title: popupSettings.title,
              subtitle: popupSettings.subtitle,
              message: popupSettings.message,
              cta_text: popupSettings.cta_text,
              cta_link: popupSettings.cta_link,
              image_url: popupSettings.image_url,
              delay_seconds: popupSettings.delay_seconds,
              show_once: popupSettings.show_once,
              coupon_code: popupSettings.coupon_code,
              template_type: popupSettings.template_type,
              stats_text: popupSettings.stats_text,
              primary_color: popupSettings.primary_color,
              background_color: popupSettings.background_color,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "tenant_id" },
          );
        popupErr = error;
      }
    }

    setSaving(false);
    if (settingsErr || brandingErr || popupErr) {
      toast({ title: "Error", description: (settingsErr || brandingErr || popupErr)?.message, variant: "destructive" });
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

  const uploadPromoImage = async (rawFile: File) => {
    if (!tenant) return;
    setUploadingPromoImage(true);
    try {
      const file = await compressImage(rawFile, "promo");
      const ext = file.name.split(".").pop();
      const path = `${tenant.id || "default"}/promo-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
      });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const url = urlData.publicUrl;
      setPopupSettings((prev) => (prev ? { ...prev, image_url: url } : prev));
      toast({ title: "Promo image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingPromoImage(false);
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
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                          Change Logo
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setBranding({ ...branding, logo_url: "" })}>
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
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
              </div>

              {/* Favicon Upload */}
              <div>
                <Label className="flex items-center gap-1 mb-2"><Image className="w-3 h-3" /> Favicon</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {branding.favicon_url ? (
                    <div className="space-y-2">
                      <img src={branding.favicon_url} alt="Favicon" className="max-h-10 mx-auto object-contain" />
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()}>
                          Change Favicon
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setBranding({ ...branding, favicon_url: "" })}>
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
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
              </div>
            </div>

            {/* Colors */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Primary Color</Label>
                <p className="text-xs text-muted-foreground mb-2">Pick a preset or customize</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { hex: "#0ea5e9", name: "Ocean" },
                    { hex: "#059669", name: "Forest" },
                    { hex: "#f97316", name: "Sunset" },
                    { hex: "#c2410c", name: "Terracotta" },
                    { hex: "#0d9488", name: "Teal" },
                    { hex: "#6366f1", name: "Indigo" },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.name}
                      onClick={() => setBranding({ ...branding, primary_color: preset.hex })}
                      className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 hover:ring-2 hover:ring-ring ${branding.primary_color.toLowerCase() === preset.hex.toLowerCase() ? "border-foreground ring-2 ring-ring" : "border-border"}`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  ))}
                </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-muted-foreground" />
                <Label>Show Reels</Label>
              </div>
              <Switch checked={settings.sticky_menu_show_reels ?? true} onCheckedChange={(v) => update("sticky_menu_show_reels", v)} />
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
                    {(settings.sticky_menu_show_reels ?? true) && (
                      <div className="flex flex-col items-center">
                        <Clapperboard className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">Reels</span>
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

        {/* Analytics & Tracking */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> Analytics &amp; Tracking
            </CardTitle>
            <CardDescription>
              Scripts are injected only on public pages (landing, stay detail, category, booking). Admin pages are never tracked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Google Analytics 4 — Measurement ID</Label>
                <Input
                  value={settings.ga_id || ""}
                  onChange={(e) => update("ga_id", e.target.value)}
                  className="mt-1 font-mono text-sm"
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Found in GA4 → Admin → Data Streams</p>
              </div>
              <div>
                <Label>Facebook Pixel ID</Label>
                <Input
                  value={settings.fb_pixel_id || ""}
                  onChange={(e) => update("fb_pixel_id", e.target.value)}
                  className="mt-1 font-mono text-sm"
                  placeholder="1234567890123456"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Found in Meta Events Manager → Pixels</p>
              </div>
              <div>
                <Label>Microsoft Clarity Project ID</Label>
                <Input
                  value={settings.clarity_id || ""}
                  onChange={(e) => update("clarity_id", e.target.value)}
                  className="mt-1 font-mono text-sm"
                  placeholder="abcde12345"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Found in Clarity → Settings → Overview</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" /> Google Calendar Integration
            </CardTitle>
            <CardDescription>Sync stay pricing and blocked dates to a Google Calendar via Google Apps Script.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>Enable Google Calendar Sync</Label>
              <Switch checked={settings.gcal_enabled} onCheckedChange={(v) => update("gcal_enabled", v)} />
            </div>

            <div>
              <Label>Google Calendar ID</Label>
              <Input
                value={settings.gcal_calendar_id || ""}
                onChange={(e) => update("gcal_calendar_id", e.target.value)}
                className="mt-1 font-mono text-sm"
                placeholder="abc123xyz@group.calendar.google.com"
                disabled={!settings.gcal_enabled}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Found in Google Calendar → Settings → Calendar ID</p>
            </div>

            <div>
              <Label>Apps Script Webhook URL</Label>
              <Input
                value={settings.gcal_webhook_url || ""}
                onChange={(e) => update("gcal_webhook_url", e.target.value)}
                className="mt-1 font-mono text-sm"
                placeholder="https://script.google.com/macros/s/.../exec"
                disabled={!settings.gcal_enabled}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Deploy your Apps Script as a web app (anyone access) and paste the URL here</p>
            </div>

            <div className="rounded-lg bg-muted/60 border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setup Guide</p>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Copy the Apps Script from <span className="font-mono bg-background px-1 rounded">google-apps-script/calendar-sync.gs</span> in this project</li>
                <li>In Google Apps Script, set Script Properties: <span className="font-mono bg-background px-1 rounded">CALENDAR_ID</span>, <span className="font-mono bg-background px-1 rounded">SUPABASE_URL</span>, <span className="font-mono bg-background px-1 rounded">SUPABASE_ANON_KEY</span></li>
                <li>Deploy → New Deployment → Web App → Execute as <em>Me</em> → Who has access: <em>Anyone</em> → Copy the URL above</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Marketing & Popups */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Marketing &amp; Popups
              <Badge variant="outline" className="text-[10px]">New</Badge>
            </CardTitle>
            <CardDescription>Configure menu popup, promo popup, coupon banner, and best features shown on your landing page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingMarketing && (
              <div className="flex items-center text-xs text-muted-foreground gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading marketing data...
              </div>
            )}
            <Tabs defaultValue="promo-popup" className="w-full">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="menu">Menu Popup</TabsTrigger>
                <TabsTrigger value="promo-popup">Promo Popup</TabsTrigger>
                <TabsTrigger value="coupons">Coupon Display</TabsTrigger>
                <TabsTrigger value="best-features">Best Features</TabsTrigger>
              </TabsList>

              <TabsContent value="menu" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Menu Popup</Label>
                    <p className="text-xs text-muted-foreground">Show a quick menu overlay on the landing page.</p>
                  </div>
                  <Switch
                    checked={settings.menu_popup_enabled}
                    onCheckedChange={(v) => update("menu_popup_enabled", v)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                  <div className="space-y-3">
                    <div>
                      <Label>Popup Title</Label>
                      <Input
                        value={settings.menu_popup_title}
                        onChange={(e) => update("menu_popup_title", e.target.value)}
                        className="mt-1"
                        placeholder="Our Menu"
                      />
                    </div>
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Menu Items</Label>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setMenuItems((items) => [
                              ...items,
                              {
                                id: `temp-${Date.now()}`,
                                category: "General",
                                name: "New Item",
                                description: "",
                                price: 0,
                                is_available: true,
                                sort_order: items.length + 1,
                              },
                            ])
                          }
                        >
                          Add Item
                        </Button>
                      </div>
                      {menuItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items yet. Click &quot;Add Item&quot; to create your first one.</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {menuItems.map((item, idx) => (
                            <div key={item.id} className="border rounded-md p-2 flex flex-col gap-1 text-xs">
                              <div className="flex gap-2">
                                <Input
                                  value={item.name}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setMenuItems((items) =>
                                      items.map((it, i) => (i === idx ? { ...it, name: v } : it)),
                                    );
                                  }}
                                  placeholder="Item name"
                                />
                                <Input
                                  value={item.category}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setMenuItems((items) =>
                                      items.map((it, i) => (i === idx ? { ...it, category: v } : it)),
                                    );
                                  }}
                                  placeholder="Category"
                                />
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => {
                                    const v = Number(e.target.value || 0);
                                    setMenuItems((items) =>
                                      items.map((it, i) => (i === idx ? { ...it, price: v } : it)),
                                    );
                                  }}
                                  className="w-24"
                                  placeholder="Price"
                                />
                              </div>
                              <Textarea
                                value={item.description}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMenuItems((items) =>
                                    items.map((it, i) => (i === idx ? { ...it, description: v } : it)),
                                  );
                                }}
                                placeholder="Short description"
                                rows={2}
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.is_available}
                                    onCheckedChange={(v) =>
                                      setMenuItems((items) =>
                                        items.map((it, i) => (i === idx ? { ...it, is_available: v } : it)),
                                      )
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {item.is_available ? "Available" : "Hidden"}
                                  </span>
                                </div>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() =>
                                    setMenuItems((items) => items.filter((_, i) => i !== idx))
                                  }
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone Preview
                    </Label>
                    <div className="mt-2 bg-muted rounded-xl p-3">
                      <div className="bg-background rounded-lg shadow-sm border overflow-hidden">
                        <div className="px-3 py-2 border-b flex items-center justify-between">
                          <span className="text-xs font-semibold">
                            {settings.menu_popup_title || "Our Menu"}
                          </span>
                          <span className="text-xs text-muted-foreground">X</span>
                        </div>
                        <div className="p-3 space-y-2 max-h-56 overflow-hidden">
                          {menuItems.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <div>
                                <div className="font-medium">{item.name || "Menu item"}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {item.description || "Short description goes here"}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-semibold">
                                  ₹{item.price || 0}
                                </div>
                                {!item.is_available && (
                                  <div className="text-[10px] text-red-500">Sold out</div>
                                )}
                              </div>
                            </div>
                          ))}
                          {menuItems.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Add items to see a live preview of your menu popup.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="promo-popup" className="mt-4 space-y-4">
                {popupSettings && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">Popup Template</Label>
                      <div className="grid gap-2 mt-2 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                          { key: "lead", label: "Lead Capture", hint: "Form + save to Leads" },
                          { key: "coupon", label: "Coupon", hint: "Code highlight + copy" },
                          { key: "offer", label: "Offer", hint: "Limited-time deal" },
                          { key: "stats", label: "Show Stats", hint: "Social proof numbers" },
                          { key: "announcement", label: "Announcement", hint: "Simple message popup" },
                        ].map((tpl) => (
                          <button
                            key={tpl.key}
                            type="button"
                            onClick={() =>
                              setPopupSettings({
                                ...popupSettings,
                                template_type: tpl.key as PopupSettings["template_type"],
                              })
                            }
                            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                              popupSettings.template_type === tpl.key
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/40"
                            }`}
                          >
                            <div className="text-xs font-semibold">{tpl.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{tpl.hint}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Promo Popup</Label>
                        <p className="text-xs text-muted-foreground">
                          Show a time-delayed promo popup on the landing page.
                        </p>
                      </div>
                      <Switch
                        checked={popupSettings.enabled}
                        onCheckedChange={(v) =>
                          setPopupSettings({ ...popupSettings, enabled: v })
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label>Title</Label>
                            <Input
                              value={popupSettings.title}
                              onChange={(e) =>
                                setPopupSettings({ ...popupSettings, title: e.target.value })
                              }
                              className="mt-1"
                              placeholder="Limited-time offer"
                            />
                          </div>
                          <div>
                            <Label>CTA Button Text</Label>
                            <Input
                              value={popupSettings.cta_text}
                              onChange={(e) =>
                                setPopupSettings({ ...popupSettings, cta_text: e.target.value })
                              }
                              className="mt-1"
                              placeholder="Book Now"
                              disabled={popupSettings.template_type === "announcement"}
                            />
                          </div>
                        </div>
                        {(popupSettings.template_type === "offer" || popupSettings.template_type === "stats") && (
                          <div>
                            <Label>Subtitle (optional)</Label>
                            <Input
                              value={popupSettings.subtitle}
                              onChange={(e) =>
                                setPopupSettings({ ...popupSettings, subtitle: e.target.value })
                              }
                              className="mt-1"
                              placeholder="Secondary heading text"
                            />
                          </div>
                        )}
                        <div>
                          <Label>Message</Label>
                          <Textarea
                            value={popupSettings.message}
                            onChange={(e) =>
                              setPopupSettings({ ...popupSettings, message: e.target.value })
                            }
                            className="mt-1"
                            rows={3}
                            placeholder="Describe your offer, free nights, early bird discount, etc."
                          />
                        </div>
                        {popupSettings.template_type === "stats" && (
                          <div>
                            <Label>Stats Text</Label>
                            <Input
                              value={popupSettings.stats_text}
                              onChange={(e) =>
                                setPopupSettings({ ...popupSettings, stats_text: e.target.value })
                              }
                              className="mt-1"
                              placeholder="10,000+ happy families"
                            />
                          </div>
                        )}
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <Label>CTA Link</Label>
                            <Input
                              value={popupSettings.cta_link}
                              onChange={(e) =>
                                setPopupSettings({ ...popupSettings, cta_link: e.target.value })
                              }
                              className="mt-1 text-xs"
                              placeholder="/stay/demo-stay or external URL"
                              disabled={popupSettings.template_type === "announcement"}
                            />
                          </div>
                          <div>
                            <Label>Delay (seconds)</Label>
                            <Input
                              type="number"
                              value={popupSettings.delay_seconds}
                              onChange={(e) =>
                                setPopupSettings({
                                  ...popupSettings,
                                  delay_seconds: Number(e.target.value || 0),
                                })
                              }
                              className="mt-1"
                              min={0}
                              max={30}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-6 md:mt-0">
                            <div className="flex flex-col gap-1">
                              <Label>Show only once per session</Label>
                              <p className="text-[11px] text-muted-foreground">
                                Uses browser session storage.
                              </p>
                            </div>
                            <Switch
                              checked={popupSettings.show_once}
                              onCheckedChange={(v) =>
                                setPopupSettings({ ...popupSettings, show_once: v })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="flex items-center gap-1 mb-1">
                              <Image className="w-3 h-3" />
                              Background Image
                            </Label>
                            <div className="border rounded-lg p-3 space-y-2">
                              {popupSettings.image_url ? (
                                <>
                                  <div className="h-24 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                    <img
                                      src={popupSettings.image_url}
                                      alt="Promo"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => promoImageInputRef.current?.click()}
                                    >
                                      Change Image
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="text-destructive"
                                      onClick={() =>
                                        setPopupSettings({ ...popupSettings, image_url: "" })
                                      }
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Remove
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => promoImageInputRef.current?.click()}
                                  disabled={uploadingPromoImage}
                                >
                                  {uploadingPromoImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-1" />
                                      Add Background Image
                                    </>
                                  )}
                                </Button>
                              )}
                              <input
                                ref={promoImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  e.target.files?.[0] && uploadPromoImage(e.target.files[0])
                                }
                              />
                              <p className="text-[11px] text-muted-foreground">
                                Optional. Use a wide image to create a hero-style promo card.
                              </p>
                            </div>
                          </div>
                          <div>
                            <Label>Attach Coupon (optional)</Label>
                            <Input
                              value={popupSettings.coupon_code}
                              onChange={(e) =>
                                setPopupSettings({
                                  ...popupSettings,
                                  coupon_code: e.target.value.toUpperCase(),
                                })
                              }
                              className="mt-1 font-mono text-xs"
                              placeholder="WELCOME10"
                              disabled={popupSettings.template_type === "announcement"}
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {popupSettings.template_type === "coupon"
                                ? "Guests will see this code in bold and can copy it."
                                : "Type an existing coupon code to highlight it in the popup."}
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="flex items-center gap-1 mb-1">
                              <Palette className="w-3 h-3" />
                              Primary Color (button / accents)
                            </Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={popupSettings.primary_color || "#e11d48"}
                                onChange={(e) =>
                                  setPopupSettings({
                                    ...popupSettings,
                                    primary_color: e.target.value,
                                  })
                                }
                                className="w-9 h-9 rounded-md border cursor-pointer"
                              />
                              <Input
                                value={popupSettings.primary_color}
                                onChange={(e) =>
                                  setPopupSettings({
                                    ...popupSettings,
                                    primary_color: e.target.value,
                                  })
                                }
                                className="mt-0 text-xs font-mono"
                                placeholder="#e11d48"
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Used for the main CTA button and highlight chips.
                            </p>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-1">
                              <Palette className="w-3 h-3" />
                              Background Color
                            </Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={popupSettings.background_color || "#f8fafc"}
                                onChange={(e) =>
                                  setPopupSettings({
                                    ...popupSettings,
                                    background_color: e.target.value,
                                  })
                                }
                                className="w-9 h-9 rounded-md border cursor-pointer"
                              />
                              <Input
                                value={popupSettings.background_color}
                                onChange={(e) =>
                                  setPopupSettings({
                                    ...popupSettings,
                                    background_color: e.target.value,
                                  })
                                }
                                className="mt-0 text-xs font-mono"
                                placeholder="#f8fafc"
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Overall card background behind text and image.
                            </p>
                          </div>
                        </div>
                        {popupSettings.template_type === "lead" && (
                          <p className="text-[11px] text-muted-foreground">
                            Lead template shows a form with Full Name + Phone (required), Email + Message (optional). Submissions will be saved in the new
                            <span className="font-semibold"> Leads </span>
                            page.
                          </p>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Phone Preview
                        </Label>
                        <div className="mt-2 bg-muted rounded-xl p-3">
                          <div className="bg-background rounded-lg shadow-lg border overflow-hidden">
                            {popupSettings.image_url && (
                              <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${popupSettings.image_url})` }} />
                            )}
                            <div className="p-3 space-y-2">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Template: {popupSettings.template_type}
                              </div>
                              <div className="text-sm font-semibold">
                                {popupSettings.title || "Limited-time offer"}
                              </div>
                              {(popupSettings.template_type === "offer" || popupSettings.template_type === "stats") && popupSettings.subtitle && (
                                <div className="text-[11px] font-medium text-foreground/80">
                                  {popupSettings.subtitle}
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground line-clamp-3">
                                {popupSettings.message || "Describe your best deal here to nudge guests to book."}
                              </div>
                              {popupSettings.template_type === "stats" && popupSettings.stats_text && (
                                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {popupSettings.stats_text}
                                </div>
                              )}
                              {popupSettings.coupon_code && (
                                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
                                  COUPON: {popupSettings.coupon_code}
                                </div>
                              )}
                              {popupSettings.template_type !== "announcement" && (
                                <Button size="sm" className="mt-1 w-full">
                                  {popupSettings.cta_text || "Book Now"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="coupons" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Coupon Banner</Label>
                    <p className="text-xs text-muted-foreground">
                      Display selected coupons as a strip below the announcement bar on the landing page.
                    </p>
                  </div>
                  <Switch
                    checked={settings.coupon_banner_enabled}
                    onCheckedChange={(v) => update("coupon_banner_enabled", v)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure which coupons are public from the <span className="font-semibold">Coupons</span> page using the
                  <span className="font-mono bg-muted px-1 rounded ml-1">show_publicly</span> toggle. The banner will automatically pick them up.
                </p>
              </TabsContent>

              <TabsContent value="best-features" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Best Features Section</Label>
                    <p className="text-xs text-muted-foreground">
                      Highlight why guests love your property with up to 6 feature cards.
                    </p>
                  </div>
                  <Switch
                    checked={settings.best_features_enabled}
                    onCheckedChange={(v) => update("best_features_enabled", v)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                  <div className="space-y-3">
                    <div>
                      <Label>Section Title</Label>
                      <Input
                        value={settings.best_features_title}
                        onChange={(e) => update("best_features_title", e.target.value)}
                        className="mt-1"
                        placeholder="Why guests love us"
                      />
                    </div>
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Features</Label>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            setFeatures((items) =>
                              items.length >= 6
                                ? items
                                : [
                                    ...items,
                                    {
                                      id: `temp-${Date.now()}`,
                                      icon_name: "Star",
                                      title: "New Feature",
                                      description: "",
                                      sort_order: items.length + 1,
                                      active: true,
                                    },
                                  ],
                            )
                          }
                        >
                          Add Feature
                        </Button>
                      </div>
                      {features.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No features yet. Add up to 6 key selling points (e.g. Infinity Pool, Pet Friendly, Jungle View).
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {features.map((feat, idx) => (
                            <div key={feat.id} className="border rounded-md p-2 flex flex-col gap-1 text-xs">
                              <div className="grid gap-2 md:grid-cols-3">
                                <Input
                                  value={feat.icon_name}
                                  onChange={(e) =>
                                    setFeatures((items) =>
                                      items.map((it, i) => (i === idx ? { ...it, icon_name: e.target.value } : it)),
                                    )
                                  }
                                  placeholder="Icon (e.g. Star, Mountain, Waves)"
                                />
                                <Input
                                  value={feat.title}
                                  onChange={(e) =>
                                    setFeatures((items) =>
                                      items.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)),
                                    )
                                  }
                                  placeholder="Title"
                                />
                                <Input
                                  type="number"
                                  value={feat.sort_order}
                                  onChange={(e) =>
                                    setFeatures((items) =>
                                      items.map((it, i) =>
                                        i === idx ? { ...it, sort_order: Number(e.target.value || 0) } : it,
                                      ),
                                    )
                                  }
                                  className="w-20"
                                  placeholder="Order"
                                />
                              </div>
                              <Textarea
                                value={feat.description}
                                onChange={(e) =>
                                  setFeatures((items) =>
                                    items.map((it, i) =>
                                      i === idx ? { ...it, description: e.target.value } : it,
                                    ),
                                  )
                                }
                                placeholder="Short description (e.g. 180-degree valley view from every room)."
                                rows={2}
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={feat.active}
                                    onCheckedChange={(v) =>
                                      setFeatures((items) =>
                                        items.map((it, i) => (i === idx ? { ...it, active: v } : it)),
                                      )
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {feat.active ? "Visible" : "Hidden"}
                                  </span>
                                </div>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() =>
                                    setFeatures((items) => items.filter((_, i) => i !== idx))
                                  }
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Section Preview
                    </Label>
                    <div className="mt-2 bg-muted rounded-xl p-3">
                      <div className="bg-background rounded-lg shadow-sm border p-3 space-y-2">
                        <div className="text-sm font-semibold">
                          {settings.best_features_title || "Why guests love us"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {features.slice(0, 4).map((feat) => (
                            <div key={feat.id} className="border rounded-md p-2 space-y-1">
                              <div className="text-[11px] font-semibold flex items-center gap-1">
                                <span className="inline-block w-4 h-4 rounded-full bg-primary/10" />
                                {feat.title || "Feature title"}
                              </div>
                              <div className="text-[10px] text-muted-foreground line-clamp-2">
                                {feat.description || "Short description of the feature."}
                              </div>
                            </div>
                          ))}
                          {features.length === 0 && (
                            <p className="text-[11px] text-muted-foreground col-span-2">
                              Add features to preview how they will appear on your landing page.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
