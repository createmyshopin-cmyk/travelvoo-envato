"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { LandingThemeScope } from "@/components/LandingThemeScope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ALLOWED_LANDING_THEME_VARS, type LandingThemePreset } from "@/lib/marketplace-theme";
import { presetLabel } from "@/lib/marketplace-manifest";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, ImageIcon, LayoutTemplate, Link as LinkIcon, Loader2, Monitor, Pencil, Plus, Smartphone, Tablet, Trash2, Upload, X,
} from "lucide-react";
import Link from "next/link";
import { Tabs as ImgTabs, TabsContent as ImgTabsContent, TabsList as ImgTabsList, TabsTrigger as ImgTabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Device = "mobile" | "tablet" | "desktop";

const DEVICE: Record<Device, { w: number; label: string; icon: ComponentType<{ className?: string }>; frame: string }> = {
  mobile: { w: 375, label: "Mobile", icon: Smartphone, frame: "rounded-[28px] border-[6px]" },
  tablet: { w: 834, label: "Tablet", icon: Tablet, frame: "rounded-[20px] border-[8px]" },
  desktop: { w: 1280, label: "Desktop", icon: Monitor, frame: "rounded-xl border-4" },
};

type HeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type HeroForm = Omit<HeroBanner, "id">;

const EMPTY: HeroForm = {
  title: "",
  subtitle: "",
  cta_text: "",
  cta_link: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

type ThemeEditorCtx = {
  banners: HeroBanner[];
  loading: boolean;
  load: () => void;
  dialogOpen: boolean;
  setDialogOpen: (v: boolean) => void;
  editing: HeroBanner | null;
  form: HeroForm;
  setForm: React.Dispatch<React.SetStateAction<HeroForm>>;
  saving: boolean;
  deleteId: string | null;
  setDeleteId: (v: string | null) => void;
  openCreate: () => void;
  openEdit: (b: HeroBanner) => void;
  saveBanner: () => Promise<void>;
  confirmDelete: () => Promise<void>;
};

const ThemeEditorContext = createContext<ThemeEditorCtx | null>(null);

function useThemeEditor() {
  const c = useContext(ThemeEditorContext);
  if (!c) throw new Error("useThemeEditor must be used within ThemeEditorProvider");
  return c;
}

function buildPreviewTokens(inputs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED_LANDING_THEME_VARS) {
    const v = (inputs[key] ?? "").trim();
    if (v) out[key] = v;
  }
  return out;
}

function PreviewHeroSlide({
  image, title, subtitle, cta,
}: { image: string; title: string; subtitle: string; cta: string }) {
  return (
    <div className="relative h-[160px] md:h-[200px] rounded-xl overflow-hidden">
      <img src={image} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute bottom-0 left-0 p-3 md:p-4 max-w-[95%]">
        <h2 className="text-lg md:text-xl font-bold text-white leading-tight">{title}</h2>
        {subtitle ? <p className="text-xs md:text-sm text-white/85 mt-1">{subtitle}</p> : null}
        {cta ? (
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {cta}
            <ChevronRight className="w-3 h-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ThemePreviewCanvas({
  preset,
  tokenInputs,
  banners,
}: {
  preset: LandingThemePreset;
  tokenInputs: Record<string, string>;
  banners: HeroBanner[];
}) {
  const [device, setDevice] = useState<Device>("mobile");
  const previewTokens = useMemo(() => buildPreviewTokens(tokenInputs), [tokenInputs]);
  const heroes = useMemo(() => banners.filter((b) => b.is_active), [banners]);
  const [heroIdx, setHeroIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeroIdx(0);
  }, [heroes.length, preset, tokenInputs]);

  useEffect(() => {
    if (heroes.length <= 1) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroes.length), 3500);
    return () => clearInterval(t);
  }, [heroes.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [device]);

  const hero = heroes[heroIdx % Math.max(heroes.length, 1)];
  const dim = DEVICE[device];

  const innerScale = cn(
    device === "mobile" && "text-[13px] leading-snug",
    device === "tablet" && "text-sm",
    device === "desktop" && "text-base"
  );

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border bg-muted/40 p-1 gap-1">
        {(Object.keys(DEVICE) as Device[]).map((d) => {
          const Ic = DEVICE[d].icon;
          return (
            <Button
              key={d}
              type="button"
              variant={device === d ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={() => setDevice(d)}
            >
              <Ic className="h-3.5 w-3.5 shrink-0" />
              {DEVICE[d].label}
              <span className="hidden sm:inline text-[10px] opacity-70 font-normal">{DEVICE[d].w}px</span>
            </Button>
          );
        })}
      </div>

      <div className="flex justify-center rounded-xl border bg-gradient-to-b from-muted/60 to-muted/30 p-3 sm:p-6 overflow-x-auto">
        <div
          className="transition-[width] duration-300 ease-out shrink-0"
          style={{ width: "min(100%, " + dim.w + "px)" }}
        >
          <div
            className={cn(
              "border-slate-800 bg-slate-800 shadow-2xl overflow-hidden mx-auto",
              dim.frame
            )}
            style={{ maxWidth: dim.w }}
          >
            {device === "mobile" && (
              <div className="h-2 bg-slate-800 flex justify-center pt-1">
                <div className="w-16 h-1 rounded-full bg-slate-600" />
              </div>
            )}
            {device === "tablet" && (
              <div className="h-2.5 bg-slate-800 flex justify-center items-end pb-0.5">
                <div className="w-10 h-1 rounded-full bg-slate-600" />
              </div>
            )}
            {device === "desktop" && (
              <div className="h-8 bg-slate-800 flex items-center px-3 gap-1.5 border-b border-slate-700">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                </div>
                <div className="flex-1 h-5 rounded bg-slate-700/80 mx-4" />
              </div>
            )}
            <div
              ref={scrollRef}
              className={cn(
                "max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden",
                device === "mobile" && "rounded-b-[22px]",
                device === "tablet" && "rounded-b-[12px]",
                device === "desktop" && "rounded-b-lg"
              )}
            >
              <LandingThemeScope
                landingThemeSlug={preset}
                themeTokens={previewTokens}
                className={cn("min-h-[380px] md:min-h-[420px]", innerScale)}
              >
                <div className="px-3 pt-3 pb-8 space-y-4">
                  <div className="h-8 rounded-lg bg-muted flex items-center px-2 gap-2">
                    <div className="h-2 w-16 bg-muted-foreground/25 rounded" />
                    <div className="flex-1" />
                    <div className="h-2 w-8 bg-muted-foreground/25 rounded" />
                  </div>

                  {hero?.image_url ? (
                    <PreviewHeroSlide
                      image={hero.image_url}
                      title={hero.title || "Your headline"}
                      subtitle={hero.subtitle || ""}
                      cta={hero.cta_text || "Book now"}
                    />
                  ) : (
                    <div className="relative h-[160px] rounded-xl overflow-hidden bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-10 w-10 opacity-40" />
                      <p className="text-xs px-4 text-center">Add a hero slide below to preview imagery</p>
                    </div>
                  )}

                  {heroes.length > 1 && (
                    <div className="flex justify-center gap-1">
                      {heroes.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={cn("h-1.5 rounded-full transition-all", i === heroIdx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")}
                          onClick={() => setHeroIdx(i)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <div className="h-2 w-28 bg-muted rounded" />
                    <div
                      className={cn(
                        "grid gap-2",
                        device === "desktop" ? "grid-cols-4" : "grid-cols-2"
                      )}
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-xl bg-muted/80 border border-border/50" />
                      ))}
                    </div>
                  </div>
                </div>
              </LandingThemeScope>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        Each device uses a fixed viewport width so you can see how the active theme scales. Save theme above to publish colors.
      </p>
    </div>
  );
}

function ImageField({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (raw: File) => {
    if (!raw.type.startsWith("image/")) {
      toast({ title: "Images only", variant: "destructive" });
      return;
    }
    setUploading(true);
    const file = await compressImage(raw, "banner");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `theme-hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    onChange(publicUrl);
    setUploading(false);
    toast({ title: "Image uploaded" });
  };

  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <ImgTabs value={tab} onValueChange={(v) => setTab(v as "upload" | "url")}>
        <ImgTabsList className="h-8">
          <ImgTabsTrigger value="upload" className="text-xs gap-1">
            <Upload className="h-3 w-3" /> Upload
          </ImgTabsTrigger>
          <ImgTabsTrigger value="url" className="text-xs gap-1">
            <LinkIcon className="h-3 w-3" /> URL
          </ImgTabsTrigger>
        </ImgTabsList>
        <ImgTabsContent value="upload" className="mt-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground hover:border-primary/50"
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {uploading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : value ? "Click to replace image" : "Click to upload"}
          </button>
          {value ? (
            <div className="relative mt-2 rounded-lg overflow-hidden border">
              <img src={value} alt="" className="w-full h-28 object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 bg-background/90 rounded-full p-1 border"
                onClick={() => onChange("")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </ImgTabsContent>
        <ImgTabsContent value="url" className="mt-2 space-y-2">
          <Input placeholder="https://..." value={value} onChange={(e) => onChange(e.target.value)} />
        </ImgTabsContent>
      </ImgTabs>
    </div>
  );
}

function useThemeEditorState(): ThemeEditorCtx {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HeroBanner | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("banners") as any)
      .select("id, title, subtitle, cta_text, cta_link, image_url, is_active, sort_order")
      .eq("type", "hero")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Could not load banners", description: error.message, variant: "destructive" });
      setBanners([]);
    } else {
      setBanners((data as HeroBanner[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ ...EMPTY, sort_order: banners.length });
    setDialogOpen(true);
  }, [banners.length]);

  const openEdit = useCallback((b: HeroBanner) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      cta_text: b.cta_text || "",
      cta_link: b.cta_link || "",
      image_url: b.image_url || "",
      is_active: b.is_active,
      sort_order: b.sort_order,
    });
    setDialogOpen(true);
  }, []);

  const saveBanner = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const { data: tenantId, error: tidErr } = await supabase.rpc("get_my_tenant_id");
    if (tidErr || !tenantId) {
      toast({ title: "No tenant", description: tidErr?.message ?? "Could not resolve tenant for this banner.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || null,
      cta_text: form.cta_text?.trim() || null,
      cta_link: form.cta_link?.trim() || null,
      image_url: form.image_url?.trim() || null,
      type: "hero" as const,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    if (!editing) {
      payload.tenant_id = tenantId;
    }
    let error: { message: string } | null = null;
    if (editing) {
      ({ error } = await (supabase.from("banners") as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase.from("banners") as any).insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Hero updated" : "Hero added" });
    setDialogOpen(false);
    load();
  }, [editing, form, load]);

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from("banners") as any).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hero slide removed" });
      load();
    }
  }, [deleteId, load]);

  return {
    banners,
    loading,
    load,
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    saving,
    deleteId,
    setDeleteId,
    openCreate,
    openEdit,
    saveBanner,
    confirmDelete,
  };
}

export function ThemeEditorProvider({ children }: { children: ReactNode }) {
  const value = useThemeEditorState();
  return (
    <ThemeEditorContext.Provider value={value}>
      {children}
      <ThemeEditorModals />
    </ThemeEditorContext.Provider>
  );
}

export function ThemePreviewSection({
  preset,
  tokenInputs,
  themeDirty,
}: {
  preset: LandingThemePreset;
  tokenInputs: Record<string, string>;
  /** True when preset/tokens differ from last saved site_settings */
  themeDirty?: boolean;
}) {
  const { banners, loading } = useThemeEditor();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">Live preview</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {presetLabel(preset)}
          </Badge>
          {themeDirty ? (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              Unsaved changes
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Matches saved theme
            </Badge>
          )}
        </div>
        <CardDescription>
          Switch Mobile / Tablet / Desktop — each frame uses that viewport width so the active theme layout fits the device.
          Colors update live as you edit; save to publish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ThemePreviewCanvas preset={preset} tokenInputs={tokenInputs} banners={banners} />
        )}
      </CardContent>
    </Card>
  );
}

export function ThemeHeroSection() {
  const {
    banners,
    loading,
    openCreate,
    openEdit,
    setDeleteId,
  } = useThemeEditor();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Hero & images
          </CardTitle>
          <CardDescription>
            Edit headline, text, CTA, and images. Replace or clear images anytime.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add slide
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {banners.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            No hero slides yet. Add one to show imagery and copy in the preview above.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "rounded-xl border overflow-hidden flex flex-col",
                  !b.is_active && "opacity-50"
                )}
              >
                <div className="relative h-28 bg-muted">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <p className="font-medium text-sm line-clamp-2">{b.title || "Untitled"}</p>
                  <div className="flex gap-1 mt-auto">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Promo & announcement strips:{" "}
          <Link href="/admin/banner" className="text-primary underline font-medium">
            Banner
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function ThemeEditorModals() {
  const {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    saving,
    deleteId,
    setDeleteId,
    saveBanner,
    confirmDelete,
  } = useThemeEditor();

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit hero slide" : "New hero slide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Subtitle</Label>
              <Textarea rows={2} value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>CTA label</Label>
                <Input value={form.cta_text} onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>CTA link</Label>
                <Input placeholder="/stays" value={form.cta_link} onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))} />
              </div>
            </div>
            <ImageField value={form.image_url || ""} onChange={(v) => setForm((f) => ({ ...f, image_url: v }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBanner} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this hero slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Storage files are not removed automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type Props = { preset: LandingThemePreset; tokenInputs: Record<string, string> };

/** Legacy single-column layout (preview + hero stacked). */
export function ThemeEditorPanel({ preset, tokenInputs }: Props) {
  return (
    <ThemeEditorProvider>
      <div className="space-y-6 min-w-0">
        <ThemePreviewSection preset={preset} tokenInputs={tokenInputs} />
        <ThemeHeroSection />
      </div>
    </ThemeEditorProvider>
  );
}
