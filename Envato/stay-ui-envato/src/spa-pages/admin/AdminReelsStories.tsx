import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Clapperboard, Plus, Pencil, Trash2, RefreshCw, GripVertical,
  Instagram, Youtube, ExternalLink, Play, Image as ImageIcon, Clock, Eye, EyeOff
} from "lucide-react";

interface ReelRow {
  id: string;
  stay_id: string;
  tenant_id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  sort_order: number;
  stay_name?: string;
}

interface StayOption {
  id: string;
  name: string;
  images: string[];
}

interface StorySettings {
  id: string;
  stories_enabled: boolean;
  stories_section_title: string;
  stories_duration: number;
  reels_enabled: boolean;
  reels_section_title: string;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", color: "from-purple-500 to-pink-500" },
  { value: "youtube", label: "YouTube", color: "bg-red-600" },
  { value: "facebook", label: "Facebook", color: "bg-blue-600" },
  { value: "tiktok", label: "TikTok", color: "bg-foreground" },
];

const platformBadgeClass: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0",
  youtube: "bg-red-600 text-white border-0",
  facebook: "bg-blue-600 text-white border-0",
  tiktok: "bg-gray-900 text-white border-0",
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === "instagram") return <Instagram className="w-3 h-3" />;
  if (platform === "youtube") return <Youtube className="w-3 h-3" />;
  return <Play className="w-3 h-3" />;
};

const emptyForm = (): Omit<ReelRow, "id" | "tenant_id" | "stay_name"> => ({
  stay_id: "",
  url: "",
  platform: "instagram",
  title: "",
  thumbnail: "",
  sort_order: 0,
});

const AdminReelsStories = () => {
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [stays, setStays] = useState<StayOption[]>([]);
  const [settings, setSettings] = useState<StorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStay, setFilterStay] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReelRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: reelsData }, { data: staysData }, { data: settingsData }] = await Promise.all([
      supabase.from("stay_reels").select("*").order("sort_order"),
      supabase.from("stays").select("id, name, images").eq("status", "active"),
      supabase.from("site_settings").select("*").limit(1).single(),
    ]);

    const stayList: StayOption[] = (staysData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      images: s.images || [],
    }));
    setStays(stayList);

    const stayMap = Object.fromEntries(stayList.map((s) => [s.id, s.name]));
    setReels(
      (reelsData || []).map((r: any) => ({ ...r, stay_name: stayMap[r.stay_id] || "Unknown Stay" }))
    );

    if (settingsData) {
      setSettings({
        id: settingsData.id,
        stories_enabled: settingsData.stories_enabled ?? true,
        stories_section_title: settingsData.stories_section_title ?? "Resort Stories",
        stories_duration: settingsData.stories_duration ?? 4,
        reels_enabled: settingsData.reels_enabled ?? true,
        reels_section_title: settingsData.reels_section_title ?? "Resort Reels",
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Try saving with the new columns (requires migration to be applied)
      const { error } = await supabase
        .from("site_settings")
        .update({
          stories_enabled: settings.stories_enabled,
          stories_section_title: settings.stories_section_title,
          stories_duration: settings.stories_duration,
          reels_enabled: settings.reels_enabled,
          reels_section_title: settings.reels_section_title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) {
        // Columns not yet in DB — run the migration first
        if (error.message.includes("schema cache") || error.message.includes("column")) {
          toast({
            title: "Migration required",
            description: "Run supabase/migrations/20260313100000_story_reel_settings.sql in your Supabase SQL editor first.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Settings saved" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (reel: ReelRow) => {
    setEditing(reel);
    setForm({
      stay_id: reel.stay_id,
      url: reel.url,
      platform: reel.platform,
      title: reel.title,
      thumbnail: reel.thumbnail,
      sort_order: reel.sort_order,
    });
    setDialogOpen(true);
  };

  const saveReel = async () => {
    if (!form.stay_id || !form.url || !form.title) {
      toast({ title: "Required fields missing", description: "Stay, URL and Title are required.", variant: "destructive" });
      return;
    }
    setFormSaving(true);

    const payload = { ...form };

    let error: any;
    if (editing) {
      ({ error } = await supabase.from("stay_reels").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("stay_reels").insert(payload));
    }

    setFormSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Reel updated" : "Reel added" });
      setDialogOpen(false);
      load();
    }
  };

  const deleteReel = async (id: string) => {
    const { error } = await supabase.from("stay_reels").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reel deleted" });
      setReels((r) => r.filter((x) => x.id !== id));
    }
  };

  const filteredReels = filterStay === "all" ? reels : reels.filter((r) => r.stay_id === filterStay);

  // Group reels by stay for the stories preview
  const storyGroups = stays
    .filter((s) => reels.some((r) => r.stay_id === s.id))
    .map((s) => ({
      stay: s,
      reels: reels.filter((r) => r.stay_id === s.id),
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clapperboard className="w-6 h-6 text-primary" /> Reels / Story
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage resort stories and reels shown on the homepage
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveSettings} disabled={saving || !settings}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Reel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stories Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Stories (Circular Thumbnails)
            </CardTitle>
            <CardDescription>Instagram-style story circles shown at the top of the homepage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {settings?.stories_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Show Stories Section
              </Label>
              <Switch
                checked={settings?.stories_enabled ?? true}
                onCheckedChange={(v) => settings && setSettings({ ...settings, stories_enabled: v })}
              />
            </div>
            <div>
              <Label>Section Title</Label>
              <Input
                className="mt-1"
                value={settings?.stories_section_title ?? "Resort Stories"}
                onChange={(e) => settings && setSettings({ ...settings, stories_section_title: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Slide Duration (seconds)
              </Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={settings?.stories_duration ?? 4}
                  onChange={(e) => settings && setSettings({ ...settings, stories_duration: +e.target.value })}
                  className="flex-1 accent-primary"
                />
                <span className="w-8 text-center font-mono font-semibold text-sm">
                  {settings?.stories_duration ?? 4}s
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">How long each image/reel thumbnail is shown before auto-advancing</p>
            </div>
          </CardContent>
        </Card>

        {/* Reels Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" /> Reels (Vertical Cards)
            </CardTitle>
            <CardDescription>Short video cards shown in the stay details page reel section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {settings?.reels_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Show Reels Section
              </Label>
              <Switch
                checked={settings?.reels_enabled ?? true}
                onCheckedChange={(v) => settings && setSettings({ ...settings, reels_enabled: v })}
              />
            </div>
            <div>
              <Label>Section Title</Label>
              <Input
                className="mt-1"
                value={settings?.reels_section_title ?? "Resort Reels"}
                onChange={(e) => settings && setSettings({ ...settings, reels_section_title: e.target.value })}
              />
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported platforms</p>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {PLATFORMS.map((p) => (
                  <Badge key={p.value} className={platformBadgeClass[p.value] || ""} variant="outline">
                    {p.label}
                  </Badge>
                ))}
              </div>
              <p className="mt-1.5">Add the public share URL from any platform. The thumbnail will be used as a preview card.</p>
            </div>
          </CardContent>
        </Card>

        {/* Stories Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Stories Preview</CardTitle>
            <CardDescription>How story circles will appear on the homepage (based on current reels)</CardDescription>
          </CardHeader>
          <CardContent>
            {storyGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No reels added yet. Add reels below and they'll appear as story circles here.
              </p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {storyGroups.map(({ stay, reels: r }) => (
                  <div key={stay.id} className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-[64px] h-[64px] rounded-full p-[3px] bg-gradient-to-br from-primary to-orange-400">
                      <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted">
                        {r[0]?.thumbnail ? (
                          <img src={r[0].thumbnail} alt={stay.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : stay.images?.[0] ? (
                          <img src={stay.images[0]} alt={stay.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground w-[64px] text-center truncate">
                      {stay.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{r.length} reel{r.length !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reels List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">All Reels</CardTitle>
                <CardDescription>{reels.length} reel{reels.length !== 1 ? "s" : ""} total</CardDescription>
              </div>
              <Select value={filterStay} onValueChange={setFilterStay}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by stay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stays</SelectItem>
                  {stays
                    .filter((s) => reels.some((r) => r.stay_id === s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReels.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Clapperboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reels yet. Click "Add Reel" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReels.map((reel) => (
                  <div
                    key={reel.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

                    {/* Thumbnail */}
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {reel.thumbnail ? (
                        <img src={reel.thumbnail} alt={reel.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{reel.title}</span>
                        <Badge className={platformBadgeClass[reel.platform] || ""} variant="outline">
                          <PlatformIcon platform={reel.platform} />
                          <span className="ml-1 capitalize">{reel.platform}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{reel.stay_name}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{reel.url}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(reel.url, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(reel)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteReel(reel.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Reel" : "Add New Reel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Stay */}
            <div>
              <Label>Stay *</Label>
              <Select value={form.stay_id} onValueChange={(v) => setForm({ ...form, stay_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select stay" />
                </SelectTrigger>
                <SelectContent>
                  {stays.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform */}
            <div>
              <Label>Platform *</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label>Title *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Morning view from the treehouse"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* URL */}
            <div>
              <Label>Reel / Video URL *</Label>
              <Input
                className="mt-1"
                placeholder="https://www.instagram.com/reel/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Paste the public share URL from Instagram, YouTube, etc.</p>
            </div>

            {/* Thumbnail */}
            <div>
              <Label>Thumbnail Image URL</Label>
              <Input
                className="mt-1"
                placeholder="https://... (leave blank to use stay image)"
                value={form.thumbnail}
                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
              />
              {form.thumbnail && (
                <div className="mt-2 w-16 h-24 rounded-lg overflow-hidden border bg-muted">
                  <img src={form.thumbnail} alt="preview" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
            </div>

            {/* Sort Order */}
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                className="mt-1 w-24"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: +e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveReel} disabled={formSaving}>
              {formSaving ? "Saving..." : editing ? "Update" : "Add Reel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReelsStories;
