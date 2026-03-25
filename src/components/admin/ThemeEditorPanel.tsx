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
  ChevronRight, ImageIcon, LayoutTemplate, Link as LinkIcon, Loader2, Monitor, Plus, Smartphone, Tablet, Upload, X,
} from "lucide-react";
import Link from "next/link";
import { Tabs as ImgTabs, TabsContent as ImgTabsContent, TabsList as ImgTabsList, TabsTrigger as ImgTabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { arrayMove } from "@dnd-kit/sortable";
import { ThemeHeroSortable } from "./ThemeHeroSortable";
import type { HeroBanner } from "./theme-editor-hero-types";

export type { HeroBanner } from "./theme-editor-hero-types";

type Device = "mobile" | "tablet" | "desktop";

const DEVICE: Record<Device, { w: number; label: string; icon: ComponentType<{ className?: string }>; frame: string }> = {
  mobile: { w: 375, label: "Mobile", icon: Smartphone, frame: "rounded-[28px] border-[6px]" },
  tablet: { w: 834, label: "Tablet", icon: Tablet, frame: "rounded-[20px] border-[8px]" },
  desktop: { w: 1280, label: "Desktop", icon: Monitor, frame: "rounded-xl border-4" },
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
  reorderHeroBanners: (activeId: string, overId: string | null) => Promise<void>;
  reordering: boolean;
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
}: {
  preset: string;
  tokenInputs: Record<string, string>;
}) {
  const [device, setDevice] = useState<Device>("mobile");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Build the token map
  const previewTokens = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(tokenInputs)) {
      const key = k.startsWith("--") ? k : `--${k}`;
      const val = v.trim();
      if (val) out[key] = val;
    }
    return out;
  }, [tokenInputs]);

  // postMessage tokens into iframe on every change
  const sendTokens = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "THEME_PREVIEW_TOKENS", tokens: previewTokens, preset },
      "*"
    );
  }, [previewTokens, preset]);

  useEffect(() => {
    const tid = setTimeout(sendTokens, 300);
    return () => clearTimeout(tid);
  }, [sendTokens]);

  // Measure the inner device frame width and compute scale
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const dim = DEVICE[device];
    const compute = () => {
      const available = el.getBoundingClientRect().width;
      setScale(available > 0 ? available / dim.w : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const dim = DEVICE[device];
  // The iframe is dim.w px wide; after scaling, visible height should be displayH
  const displayH = 680;
  const iframeH = scale > 0 ? Math.ceil(displayH / scale) : displayH;

  return (
    <div className="space-y-4">
      {/* Device switcher */}
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
              <span className="hidden sm:inline text-[10px] opacity-60 font-normal">{DEVICE[d].w}px</span>
            </Button>
          );
        })}
      </div>

      {/* Outer centering shell */}
      <div className="rounded-xl border bg-gradient-to-b from-slate-900 to-slate-800 p-4 flex justify-center">
        {/* Device chrome wrapper — fills available width */}
        <div
          ref={frameRef}
          className={cn(
            "w-full max-w-full border-slate-700 bg-slate-900 shadow-2xl",
            dim.frame
          )}
          style={{ maxWidth: dim.w }}
        >
          {/* Status bar / browser bar chrome */}
          {device === "mobile" && (
            <div className="h-7 bg-slate-900 flex items-center justify-center">
              <div className="w-20 h-1.5 rounded-full bg-slate-600" />
            </div>
          )}
          {device === "tablet" && (
            <div className="h-5 bg-slate-900 flex items-center justify-center">
              <div className="w-14 h-1.5 rounded-full bg-slate-600" />
            </div>
          )}
          {device === "desktop" && (
            <div className="h-9 bg-slate-800 flex items-center px-3 gap-2 border-b border-slate-700">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/90" />
                <span className="w-3 h-3 rounded-full bg-amber-400/90" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/90" />
              </div>
              <div className="flex-1 h-5 rounded-full bg-slate-700 mx-6">
                <div className="h-full flex items-center px-3">
                  <span className="text-[10px] text-slate-400 truncate">yoursite.com</span>
                </div>
              </div>
            </div>
          )}

          {/* Scaled iframe viewport */}
          <div
            className={cn(
              "overflow-hidden relative",
              device === "mobile" && "rounded-b-[2rem]",
              device === "tablet" && "rounded-b-2xl",
              device === "desktop" && "rounded-b-xl"
            )}
            style={{ height: displayH }}
          >
            <iframe
              ref={iframeRef}
              src="/"
              title="Live preview"
              scrolling="no"
              style={{
                width: dim.w,
                height: iframeH,
                border: "none",
                display: "block",
                transformOrigin: "top left",
                transform: `scale(${scale})`,
                pointerEvents: "none",
              }}
              onLoad={sendTokens}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Live preview of your actual landing page · colors update instantly · save to publish
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
  const [reordering, setReordering] = useState(false);
  const bannersRef = useRef(banners);
  bannersRef.current = banners;

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

  const reorderHeroBanners = useCallback(
    async (activeId: string, overId: string | null) => {
      if (!overId || activeId === overId) return;
      const prev = bannersRef.current;
      const oldIndex = prev.findIndex((b) => b.id === activeId);
      const newIndex = prev.findIndex((b) => b.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(prev, oldIndex, newIndex).map((b, i) => ({ ...b, sort_order: i }));
      setBanners(next);
      setReordering(true);
      try {
        const results = await Promise.all(
          next.map((b) =>
            (supabase.from("banners") as any).update({ sort_order: b.sort_order }).eq("id", b.id)
          )
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) {
          toast({ title: "Reorder failed", description: failed.error.message, variant: "destructive" });
          load();
        }
      } finally {
        setReordering(false);
      }
    },
    [load]
  );

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
    reorderHeroBanners,
    reordering,
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
          <ThemePreviewCanvas preset={preset} tokenInputs={tokenInputs} />
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
    reorderHeroBanners,
    reordering,
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
            Drag slides by the handle to reorder (carousel order updates in the live preview). Edit headline, CTA, and images anytime.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} disabled={reordering}>
          <Plus className="h-4 w-4 mr-1" /> Add slide
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {banners.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            No hero slides yet. Add one to show imagery and copy in the preview above.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ThemeHeroSortable
            banners={banners}
            reordering={reordering}
            reorderHeroBanners={reorderHeroBanners}
            openEdit={openEdit}
            setDeleteId={setDeleteId}
          />
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
