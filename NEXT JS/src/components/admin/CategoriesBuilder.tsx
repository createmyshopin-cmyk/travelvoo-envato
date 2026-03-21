import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Save, Heart, Users, Gem, Wallet, Fan, Waves, TreePine, Home, Building2, Mountain, Tent, Star, Palmtree, Compass, UtensilsCrossed, Tag, Sparkles, Sun, Moon, Flame, Anchor, Zap } from "lucide-react";

const ICON_OPTIONS = [
  { value: "Heart", Icon: Heart },
  { value: "Users", Icon: Users },
  { value: "Gem", Icon: Gem },
  { value: "Wallet", Icon: Wallet },
  { value: "Fan", Icon: Fan },
  { value: "Waves", Icon: Waves },
  { value: "TreePine", Icon: TreePine },
  { value: "Home", Icon: Home },
  { value: "Building2", Icon: Building2 },
  { value: "Mountain", Icon: Mountain },
  { value: "Tent", Icon: Tent },
  { value: "Star", Icon: Star },
  { value: "Palmtree", Icon: Palmtree },
  { value: "Compass", Icon: Compass },
  { value: "UtensilsCrossed", Icon: UtensilsCrossed },
  { value: "Tag", Icon: Tag },
  { value: "Sparkles", Icon: Sparkles },
  { value: "Sun", Icon: Sun },
  { value: "Moon", Icon: Moon },
  { value: "Flame", Icon: Flame },
  { value: "Anchor", Icon: Anchor },
  { value: "Zap", Icon: Zap },
];

export const ICON_MAP: Record<string, React.ComponentType<any>> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.value, o.Icon])
);

interface Category {
  id: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export default function CategoriesBuilder() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("Tag");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const fetch = async () => {
    const { data } = await supabase.from("stay_categories" as any).select("*").order("sort_order");
    setCategories((data as any[] || []).map((d: any) => ({ id: d.id, label: d.label, icon: d.icon, sort_order: d.sort_order, active: d.active })));
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('stay_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stay_categories' }, () => {
        fetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addCategory = async () => {
    if (!newLabel.trim()) return;
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
    const { error } = await supabase.from("stay_categories" as any).insert({ label: newLabel.trim(), icon: newIcon, sort_order: maxOrder } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewLabel("");
      setNewIcon("Tag");
      fetch();
      toast({ title: "Category added" });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("stay_categories" as any).update({ active } as any).eq("id", id);
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, active } : c));
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
  };

  const saveEdit = async (id: string) => {
    if (!editLabel.trim()) return;
    const { error } = await supabase.from("stay_categories" as any).update({ label: editLabel.trim() } as any).eq("id", id);
    if (!error) {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, label: editLabel.trim() } : c));
      toast({ title: "Category renamed" });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("stay_categories" as any).delete().eq("id", id);
    fetch();
    toast({ title: "Category deleted" });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((c, i) => (c.sort_order = i));
    setCategories(updated);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((c, i) => (c.sort_order = i));
    setCategories(updated);
  };

  const saveOrder = async () => {
    setSaving(true);
    for (const c of categories) {
      await supabase.from("stay_categories" as any).update({ sort_order: c.sort_order } as any).eq("id", c.id);
    }
    setSaving(false);
    toast({ title: "Order saved" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Homepage Categories</h3>
          <p className="text-sm text-muted-foreground">Manage the category tabs shown on the homepage</p>
        </div>
        <Button size="sm" onClick={saveOrder} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />{saving ? "Saving..." : "Save Order"}
        </Button>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Category Name</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Beachfront" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs mb-1 block">Icon</Label>
              <Select value={newIcon} onValueChange={setNewIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(({ value, Icon }) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{value}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addCategory} disabled={!newLabel.trim()}>
                <Plus className="mr-1 h-4 w-4" />Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((cat, index) => {
          const IconComp = ICON_MAP[cat.icon] || Tag;
          return (
            <div key={cat.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${cat.active ? "bg-card" : "bg-muted/50 opacity-60"}`}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(index)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <button onClick={() => moveDown(index)} disabled={index === categories.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconComp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(cat.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => saveEdit(cat.id)}>✓</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelEdit}>✕</Button>
                  </div>
                ) : (
                  <p className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => startEditing(cat)}>{cat.label}</p>
                )}
                <p className="text-xs text-muted-foreground">Icon: {cat.icon} · Order: {cat.sort_order}</p>
              </div>
              <Badge variant={cat.active ? "default" : "secondary"} className="shrink-0">
                {cat.active ? "Visible" : "Hidden"}
              </Badge>
              <Switch checked={cat.active} onCheckedChange={(v) => toggleActive(cat.id, v)} />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteCategory(cat.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No categories yet. Add one above.</p>
        )}
      </div>

      {/* Preview */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {categories.filter((c) => c.active).map((cat) => {
            const IconComp = ICON_MAP[cat.icon] || Tag;
            return (
              <div key={cat.id} className="flex flex-col items-center gap-2 shrink-0 min-w-[72px] py-3 px-2 rounded-2xl bg-muted text-muted-foreground">
                <IconComp className="w-6 h-6" />
                <span className="text-[11px] font-semibold text-center leading-tight">{cat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
