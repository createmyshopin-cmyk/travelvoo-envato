import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ImageIcon, Plus, Pencil, Trash2, GripVertical,
  Megaphone, Star, LayoutTemplate, RefreshCw, ChevronRight,
  Monitor, Upload, Link, Loader2, X, Smartphone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BannerType = "hero" | "promo" | "announcement";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  type: BannerType;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const EMPTY_BANNER: Omit<Banner, "id" | "created_at"> = {
  title: "", subtitle: "", cta_text: "", cta_link: "",
  image_url: "", type: "hero", is_active: true, sort_order: 0,
};

const TYPE_META: Record<BannerType, { label: string; icon: React.ElementType; color: string }> = {
  hero:         { label: "Hero",         icon: LayoutTemplate, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  promo:        { label: "Promo",        icon: Star,           color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  announcement: { label: "Announcement", icon: Megaphone,      color: "bg-purple-500/10 text-purple-600 border-purple-200" },
};

// ─── Phone Live Preview ───────────────────────────────────────────────────────

function HeroSlide({
  banner, onClick,
}: { banner: Banner; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative h-[140px] rounded-xl overflow-hidden cursor-pointer group ring-0 hover:ring-2 hover:ring-primary transition-all"
    >
      {banner.image_url ? (
        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-3 flex flex-col gap-1">
        <h2 className="text-[11px] font-bold text-white leading-tight">{banner.title}</h2>
        {banner.subtitle && <p className="text-[9px] text-white/80 leading-tight">{banner.subtitle}</p>}
        {banner.cta_text && (
          <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[8px] font-semibold w-fit">
            {banner.cta_text}<ChevronRight className="w-2 h-2" />
          </span>
        )}
      </div>
      {/* Edit hint */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="bg-white/90 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pencil className="w-2.5 h-2.5" /> Edit
        </span>
      </div>
    </div>
  );
}

function PromoSlide({
  banner, onClick,
}: { banner: Banner; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="shrink-0 w-[85%] rounded-xl overflow-hidden relative cursor-pointer group ring-0 hover:ring-2 hover:ring-primary transition-all"
    >
      <div className="relative h-[90px]">
        {banner.image_url ? (
          <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2">
          {banner.subtitle && (
            <p className="text-white text-[8px] font-semibold uppercase tracking-wider opacity-90">{banner.subtitle}</p>
          )}
          <h4 className="text-white text-[10px] font-extrabold leading-tight">{banner.title}</h4>
          {banner.cta_text && (
            <span className="inline-flex items-center gap-0.5 mt-1 bg-primary text-primary-foreground text-[7px] font-bold px-2 py-0.5 rounded">
              {banner.cta_text}<ChevronRight className="w-2 h-2" />
            </span>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="bg-white/90 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pencil className="w-2.5 h-2.5" /> Edit
        </span>
      </div>
    </div>
  );
}

function PhonePreview({
  banners, onEdit,
}: { banners: Banner[]; onEdit: (b: Banner) => void }) {
  const heroes   = banners.filter((b) => b.type === "hero"   && b.is_active);
  const promos   = banners.filter((b) => b.type === "promo"  && b.is_active);
  const announcements = banners.filter((b) => b.type === "announcement" && b.is_active);
  const [heroIdx, setHeroIdx] = useState(0);

  // Auto-cycle hero slides
  useEffect(() => {
    if (heroes.length <= 1) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroes.length), 3000);
    return () => clearInterval(t);
  }, [heroes.length]);

  const allEmpty = heroes.length === 0 && promos.length === 0 && announcements.length === 0;

  return (
    /* Phone frame */
    <div className="mx-auto" style={{ width: 240 }}>
      <div className="relative bg-background border-[3px] border-slate-800 rounded-[28px] shadow-2xl overflow-hidden" style={{ height: 480 }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-b-xl z-10" />
        {/* Screen */}
        <div className="h-full overflow-y-auto pt-5 pb-4 bg-background scrollbar-hide">
          {/* Status bar mock */}
          <div className="px-4 pb-1 flex justify-between items-center">
            <span className="text-[7px] font-semibold text-muted-foreground">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/60" />
              <div className="w-1 h-1 rounded-full bg-muted-foreground/60" />
            </div>
          </div>

          {allEmpty ? (
            <div className="flex flex-col items-center justify-center h-[350px] gap-2 text-muted-foreground px-4 text-center">
              <Smartphone className="h-10 w-10 opacity-30" />
              <p className="text-[10px]">No active banners yet.</p>
              <p className="text-[9px] opacity-60">Add banners and activate them to see the preview.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Announcements strip */}
              {announcements.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onEdit(b)}
                  className="mx-3 flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
                >
                  <Megaphone className="h-3 w-3 text-purple-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold text-purple-900 dark:text-purple-100 leading-tight truncate">{b.title}</p>
                    {b.subtitle && <p className="text-[8px] text-purple-700 dark:text-purple-300 truncate">{b.subtitle}</p>}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 shrink-0">
                    <Pencil className="w-2.5 h-2.5 text-primary" />
                  </div>
                </div>
              ))}

              {/* Hero banner */}
              {heroes.length > 0 && (
                <div className="px-3">
                  <HeroSlide banner={heroes[heroIdx % heroes.length]} onClick={() => onEdit(heroes[heroIdx % heroes.length])} />
                  {heroes.length > 1 && (
                    <div className="flex justify-end gap-1 mt-1.5">
                      {heroes.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setHeroIdx(i)}
                          className={`h-1 rounded-full transition-all ${i === heroIdx ? "w-3 bg-primary" : "w-1 bg-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section dividers / mock content */}
              <div className="px-3 space-y-1">
                <div className="h-2 w-24 bg-muted rounded" />
                <div className="flex gap-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-6 flex-1 bg-muted rounded-lg" />)}
                </div>
              </div>

              {/* Promo banners */}
              {promos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 mb-1.5">
                    <span className="text-[9px] font-bold">Special Offers</span>
                    <span className="text-[8px] text-primary font-semibold">View All</span>
                  </div>
                  <div className="flex gap-2 px-3 overflow-x-auto scrollbar-hide">
                    {promos.map((b) => (
                      <PromoSlide key={b.id} banner={b} onClick={() => onEdit(b)} />
                    ))}
                  </div>
                </div>
              )}

              {/* More mock content */}
              <div className="px-3 space-y-1.5">
                <div className="h-2 w-20 bg-muted rounded" />
                {[1,2].map(i => (
                  <div key={i} className="flex gap-2">
                    <div className="h-12 w-16 bg-muted rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                      <div className="h-2 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Bottom bar mock */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-background/90 backdrop-blur border-t border-muted flex items-center justify-center">
          <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2">Live Preview — click any banner to edit</p>
    </div>
  );
}

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({
  value, onChange,
}: { value: string; onChange: (url: string) => void }) {
  const [tab, setTab] = useState<"upload" | "url">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (rawFile: File) => {
    if (!rawFile.type.startsWith("image/")) {
      toast({ title: "Only image files are supported", variant: "destructive" });
      return;
    }
    setUploading(true);
    const file = await compressImage(rawFile, "banner");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `banner-${Date.now()}.${ext}`;
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
  }, [onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <Label>Banner Image</Label>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="h-8">
          <TabsTrigger value="upload" className="text-xs h-7 px-3">
            <Upload className="h-3 w-3 mr-1.5" />Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs h-7 px-3">
            <Link className="h-3 w-3 mr-1.5" />URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-2">
          <div
            className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {uploading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
            ) : value ? (
              <div className="relative">
                <img src={value} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(""); }}
                  className="absolute top-1.5 right-1.5 bg-background/90 rounded-full p-0.5 border shadow hover:bg-destructive hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1.5 left-1.5 bg-background/90 text-[10px] px-2 py-0.5 rounded border">
                  Click to replace
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <Upload className="h-7 w-7 opacity-50" />
                <div className="text-center">
                  <p className="text-xs font-medium">Click to upload or drag & drop</p>
                  <p className="text-[10px] opacity-70 mt-0.5">PNG, JPG, WebP up to 5MB</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-2 space-y-2">
          <Input
            placeholder="https://example.com/banner.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={value}
                alt="preview"
                className="w-full h-32 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <button
                onClick={() => onChange("")}
                className="absolute top-1.5 right-1.5 bg-background/90 rounded-full p-0.5 border shadow hover:bg-destructive hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── BannerCard ───────────────────────────────────────────────────────────────

function BannerCard({
  banner, onEdit, onDelete, onToggle,
}: {
  banner: Banner;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const meta = TYPE_META[banner.type];
  const Icon = meta.icon;
  const noImage = !banner.image_url;

  return (
    <Card className={`overflow-hidden transition-all border shadow-sm ${!banner.is_active ? "opacity-55" : ""}`}>
      {/* Hero preview */}
      {banner.type === "hero" && (
        <div className="relative h-[180px] bg-muted overflow-hidden rounded-t-lg">
          {noImage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-br from-muted to-muted/60">
              <ImageIcon className="h-10 w-10 opacity-40" />
              <span className="text-xs">No image set</span>
            </div>
          ) : (
            <img src={banner.image_url!} alt={banner.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4 flex flex-col gap-1.5">
            <h2 className="text-base font-bold text-white leading-tight">{banner.title || "Banner Title"}</h2>
            {banner.subtitle && <p className="text-xs text-white/80">{banner.subtitle}</p>}
            {banner.cta_text && (
              <span className="inline-flex items-center gap-1 mt-0.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold w-fit shadow">
                {banner.cta_text}<ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <BadgeOverlay meta={meta} Icon={Icon} sortOrder={banner.sort_order} isActive={banner.is_active} />
        </div>
      )}

      {/* Promo preview */}
      {banner.type === "promo" && (
        <div className="relative h-[145px] bg-muted overflow-hidden rounded-t-lg">
          {noImage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-br from-yellow-50 to-muted">
              <ImageIcon className="h-8 w-8 opacity-40" />
              <span className="text-xs">No image set</span>
            </div>
          ) : (
            <img src={banner.image_url!} alt={banner.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {banner.subtitle && (
              <p className="text-white text-[10px] font-semibold uppercase tracking-wider opacity-90">{banner.subtitle}</p>
            )}
            <h4 className="text-white text-sm font-extrabold mt-0.5 leading-tight">{banner.title || "Promo Title"}</h4>
            {banner.cta_text && (
              <span className="inline-flex items-center gap-0.5 mt-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-lg">
                {banner.cta_text}<ChevronRight className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <BadgeOverlay meta={meta} Icon={Icon} sortOrder={banner.sort_order} isActive={banner.is_active} />
        </div>
      )}

      {/* Announcement preview */}
      {banner.type === "announcement" && (
        <div className="relative overflow-hidden rounded-t-lg">
          {!noImage && (
            <img src={banner.image_url!} alt={banner.title} className="w-full h-[90px] object-cover" />
          )}
          <div className={`flex items-start gap-3 px-4 py-4 ${noImage ? "bg-purple-50 dark:bg-purple-950/20" : "bg-gradient-to-r from-foreground/80 to-foreground/60"}`}>
            <span className={`mt-0.5 shrink-0 rounded-full p-1.5 ${noImage ? "bg-purple-100 text-purple-600" : "bg-white/20 text-white"}`}>
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-sm leading-snug ${noImage ? "text-purple-900 dark:text-purple-100" : "text-white"}`}>
                {banner.title || "Announcement Title"}
              </p>
              {banner.subtitle && (
                <p className={`text-xs mt-0.5 ${noImage ? "text-purple-700 dark:text-purple-300" : "text-white/80"}`}>{banner.subtitle}</p>
              )}
              {banner.cta_text && (
                <span className={`inline-flex items-center gap-0.5 mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg ${noImage ? "bg-purple-600 text-white" : "bg-white/20 text-white border border-white/30"}`}>
                  {banner.cta_text}<ChevronRight className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          </div>
          <BadgeOverlay meta={meta} Icon={Icon} sortOrder={banner.sort_order} isActive={banner.is_active} />
        </div>
      )}

      {/* Actions bar */}
      <CardContent className="px-4 py-3 flex items-center justify-between border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Switch checked={banner.is_active} onCheckedChange={onToggle} className="scale-90" />
          <span className="text-xs text-muted-foreground">{banner.is_active ? "Active" : "Inactive"}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeOverlay({
  meta, Icon, sortOrder, isActive,
}: { meta: { color: string; label: string }; Icon: React.ElementType; sortOrder: number; isActive: boolean }) {
  return (
    <>
      <span className={`absolute top-2 left-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border backdrop-blur-sm bg-white/80 ${meta.color}`}>
        <Icon className="h-3 w-3" />{meta.label}
      </span>
      <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs bg-white/80 backdrop-blur-sm border px-2 py-0.5 rounded text-muted-foreground">
        <GripVertical className="h-3 w-3" />#{sortOrder}
      </span>
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Badge variant="outline" className="bg-background/90 text-xs font-semibold">Inactive</Badge>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBanner() {
  const [banners, setBanners]         = useState<Banner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [typeFilter, setTypeFilter]   = useState<"all" | BannerType>("all");
  const [showActive, setShowActive]   = useState<"all" | "active" | "inactive">("all");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Banner | null>(null);
  const [form, setForm]             = useState(EMPTY_BANNER);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("banners") as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load banners", description: error.message, variant: "destructive" });
    } else {
      setBanners((data as Banner[]) || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_BANNER, sort_order: banners.length });
    setDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setForm({
      title:      banner.title,
      subtitle:   banner.subtitle || "",
      cta_text:   banner.cta_text || "",
      cta_link:   banner.cta_link || "",
      image_url:  banner.image_url || "",
      type:       banner.type,
      is_active:  banner.is_active,
      sort_order: banner.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const { data: tenantId, error: tidErr } = await supabase.rpc("get_my_tenant_id");
    if (!editing && (tidErr || !tenantId)) {
      toast({
        title: "No tenant",
        description: tidErr?.message ?? "Could not resolve tenant for this banner.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title:      form.title.trim(),
      subtitle:   form.subtitle?.trim()   || null,
      cta_text:   form.cta_text?.trim()   || null,
      cta_link:   form.cta_link?.trim()   || null,
      image_url:  form.image_url?.trim()  || null,
      type:       form.type,
      is_active:  form.is_active,
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
    } else {
      toast({ title: editing ? "Banner updated" : "Banner created" });
      setDialogOpen(false);
      fetchBanners();
    }
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await (supabase.from("banners") as any)
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from("banners") as any).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Banner deleted" });
      fetchBanners();
    }
  };

  const filtered = banners.filter((b) => {
    if (typeFilter !== "all" && b.type !== typeFilter) return false;
    if (showActive === "active"   && !b.is_active) return false;
    if (showActive === "inactive" &&  b.is_active) return false;
    return true;
  });

  const stats = {
    total:        banners.length,
    active:       banners.filter((b) => b.is_active).length,
    hero:         banners.filter((b) => b.type === "hero").length,
    promo:        banners.filter((b) => b.type === "promo").length,
    announcement: banners.filter((b) => b.type === "announcement").length,
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Banner Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage hero, promotional, and announcement banners.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={previewOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            <Monitor className="h-4 w-4 mr-2" />
            {previewOpen ? "Hide Preview" : "Live Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchBanners} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Add Banner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",         value: stats.total,        color: "text-foreground" },
          { label: "Active",        value: stats.active,       color: "text-green-600" },
          { label: "Hero",          value: stats.hero,         color: "text-blue-600" },
          { label: "Promo",         value: stats.promo,        color: "text-yellow-600" },
          { label: "Announcements", value: stats.announcement, color: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="p-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="hero">Hero</SelectItem>
            <SelectItem value="promo">Promo</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={showActive} onValueChange={(v) => setShowActive(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || showActive !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setShowActive("all"); }}>
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} banner{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Main: cards + optional preview */}
      <div className={`flex gap-6 items-start ${previewOpen ? "flex-col xl:flex-row" : ""}`}>

        {/* Cards grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="h-44 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">No banners found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeFilter !== "all" || showActive !== "all"
                    ? "Try adjusting your filters."
                    : "Click \"Add Banner\" to create your first banner."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${previewOpen ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
              {filtered.map((banner) => (
                <BannerCard
                  key={banner.id}
                  banner={banner}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => setDeleteId(banner.id)}
                  onToggle={() => toggleActive(banner)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live Preview panel */}
        {previewOpen && (
          <div className="xl:w-[300px] shrink-0">
            <div className="sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Mobile Preview</span>
                <Badge variant="secondary" className="text-[10px] px-1.5">Live</Badge>
              </div>
              <PhonePreview banners={banners} onEdit={openEdit} />
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-1">
              <Label>Banner Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as BannerType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero — Full-width landing banner</SelectItem>
                  <SelectItem value="promo">Promo — Promotional offer strip</SelectItem>
                  <SelectItem value="announcement">Announcement — Info notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Summer Escape Awaits"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <Label>Subtitle</Label>
              <Textarea
                placeholder="Short description or tagline"
                rows={2}
                value={form.subtitle || ""}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              />
            </div>

            {/* Image uploader */}
            <ImageUploader
              value={form.image_url || ""}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            />

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>CTA Button Text</Label>
                <Input
                  placeholder="e.g. Book Now"
                  value={form.cta_text || ""}
                  onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>CTA Link</Label>
                <Input
                  placeholder="/stays or https://..."
                  value={form.cta_link || ""}
                  onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                />
              </div>
            </div>

            {/* Sort + Active */}
            <div className="flex items-center gap-6">
              <div className="space-y-1 flex-1">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="banner-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="banner-active">Active</Label>
              </div>
            </div>

            {/* Inline preview */}
            {form.title && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className="border rounded-xl overflow-hidden">
                  {form.type === "hero" && (
                    <div className="relative h-[140px] bg-muted">
                      {form.image_url && <img src={form.image_url} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-3 flex flex-col gap-1">
                        <h2 className="text-sm font-bold text-white leading-tight">{form.title}</h2>
                        {form.subtitle && <p className="text-[11px] text-white/80">{form.subtitle}</p>}
                        {form.cta_text && (
                          <span className="inline-flex items-center gap-1 mt-0.5 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold w-fit">
                            {form.cta_text}<ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {form.type === "promo" && (
                    <div className="relative h-[120px] bg-gradient-to-br from-amber-300 to-orange-400">
                      {form.image_url && <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {form.subtitle && <p className="text-white text-[9px] font-semibold uppercase tracking-wider">{form.subtitle}</p>}
                        <h4 className="text-white text-sm font-extrabold">{form.title}</h4>
                        {form.cta_text && (
                          <span className="inline-flex items-center gap-0.5 mt-1 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded">
                            {form.cta_text}<ChevronRight className="w-2 h-2" />
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {form.type === "announcement" && (
                    <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/20 px-4 py-3">
                      <Megaphone className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{form.title}</p>
                        {form.subtitle && <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">{form.subtitle}</p>}
                        {form.cta_text && (
                          <span className="inline-flex items-center gap-0.5 mt-1.5 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {form.cta_text}<ChevronRight className="w-2 h-2" />
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : editing ? "Save Changes" : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The banner will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
