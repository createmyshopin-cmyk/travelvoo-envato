"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save } from "lucide-react";
import { slugify } from "@/lib/slugify";

interface AdminPackageCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful create or update */
  onSaved: () => void;
  /** When set, dialog loads this trip and saves with UPDATE */
  editTripId?: string | null;
}

const defaultImages = ["/assets/stay-1.jpg"];

export function AdminPackageCreateDialog({
  open,
  onOpenChange,
  onSaved,
  editTripId = null,
}: AdminPackageCreateDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [durationNights, setDurationNights] = useState("1");
  const [durationDays, setDurationDays] = useState("2");
  const [pickup, setPickup] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("active");
  const [imagesText, setImagesText] = useState("");

  const isEdit = Boolean(editTripId);

  const reset = useCallback(() => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setDurationNights("1");
    setDurationDays("2");
    setPickup("");
    setStartingPrice("");
    setOriginalPrice("");
    setDiscountLabel("");
    setStatus("active");
    setImagesText("");
  }, []);

  useEffect(() => {
    if (open && !editTripId) {
      reset();
      setSlugTouched(false);
    }
  }, [open, editTripId, reset]);

  useEffect(() => {
    if (!open || !editTripId) return;
    let cancelled = false;
    (async () => {
      setLoadingTrip(true);
      const { data, error } = await (supabase.from("trips") as any)
        .select("*")
        .eq("id", editTripId)
        .single();
      if (cancelled) return;
      setLoadingTrip(false);
      if (error || !data) {
        toast({
          title: "Could not load package",
          description: error?.message || "Not found",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }
      setName(data.name ?? "");
      setSlug(data.slug ?? "");
      setSlugTouched(true);
      setDescription(data.description ?? "");
      setDurationNights(String(data.duration_nights ?? 1));
      setDurationDays(String(data.duration_days ?? 2));
      setPickup(data.pickup_drop_location ?? "");
      setStartingPrice(String(data.starting_price ?? ""));
      setOriginalPrice(
        data.original_price != null && Number(data.original_price) !== Number(data.starting_price)
          ? String(data.original_price)
          : ""
      );
      setDiscountLabel(data.discount_label ?? "");
      setStatus((data.status as "active" | "draft" | "archived") || "active");
      const imgs = Array.isArray(data.images) ? data.images : [];
      setImagesText(imgs.length ? imgs.join("\n") : "");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editTripId, onOpenChange, toast]);

  useEffect(() => {
    if (!slugTouched && name && !isEdit) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched, isEdit]);

  const parseImages = (): string[] => {
    const raw = imagesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.length > 0 ? raw : defaultImages;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugFinal = slugify(slug.trim() || name);
    if (!name.trim() || !slugFinal) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    const start = parseFloat(startingPrice);
    if (Number.isNaN(start) || start < 0) {
      toast({ title: "Enter a valid starting price", variant: "destructive" });
      return;
    }
    const orig = originalPrice.trim() === "" ? start : parseFloat(originalPrice);
    if (Number.isNaN(orig) || orig < 0) {
      toast({ title: "Enter a valid original price", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");

    const row: Record<string, unknown> = {
      slug: slugFinal,
      name: name.trim(),
      description: description.trim(),
      duration_nights: Math.max(0, parseInt(durationNights, 10) || 1),
      duration_days: Math.max(1, parseInt(durationDays, 10) || 2),
      pickup_drop_location: pickup.trim(),
      images: parseImages(),
      starting_price: start,
      original_price: orig,
      discount_label: discountLabel.trim() || null,
      status,
    };

    let error: { code?: string; message: string } | null = null;

    if (isEdit && editTripId) {
      const { error: upErr } = await (supabase.from("trips") as any)
        .update(row)
        .eq("id", editTripId);
      error = upErr;
    } else {
      const insertRow = {
        ...row,
        cancellation_policy: [],
        ...(tenantId != null ? { tenant_id: tenantId } : { tenant_id: null }),
      };
      const { error: insErr } = await (supabase.from("trips") as any)
        .insert(insertRow)
        .select("id")
        .single();
      error = insErr;
    }

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Slug already exists",
          description: "Choose a different URL slug (another package uses it).",
          variant: "destructive",
        });
      } else {
        toast({
          title: isEdit ? "Could not update package" : "Could not create package",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: isEdit ? "Package updated" : "Package created",
      description: isEdit ? `Changes saved for /trip/${slugFinal}` : `/${slugFinal} is ready.`,
    });
    if (!isEdit) reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit package" : "Create package"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this trip/package. Changing the slug changes the public URL."
              : (
                <>
                  Adds a row to <code className="text-xs">trips</code>. It will appear on{" "}
                  <code className="text-xs">/trips</code> and <code className="text-xs">/trip/[slug]</code>.
                </>
              )}
          </DialogDescription>
        </DialogHeader>
        {loadingTrip ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading package…</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">Package name *</Label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coorg Weekend Escape"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-slug">URL slug *</Label>
            <Input
              id="pkg-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="coorg-weekend-escape"
              className="font-mono text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short summary for listings and SEO"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pkg-nights">Nights</Label>
              <Input
                id="pkg-nights"
                type="number"
                min={0}
                value={durationNights}
                onChange={(e) => setDurationNights(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-days">Days</Label>
              <Input
                id="pkg-days"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-pickup">Pickup &amp; drop</Label>
            <Input
              id="pkg-pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="e.g. Bangalore"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pkg-start">Starting price *</Label>
              <Input
                id="pkg-start"
                type="number"
                min={0}
                step="1"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                placeholder="4599"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-orig">Original price</Label>
              <Input
                id="pkg-orig"
                type="number"
                min={0}
                step="1"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Same as starting if empty"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-discount">Discount label</Label>
            <Input
              id="pkg-discount"
              value={discountLabel}
              onChange={(e) => setDiscountLabel(e.target.value)}
              placeholder='e.g. Save ₹600'
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "draft" | "archived")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pkg-images">Image URLs (optional)</Label>
            <Textarea
              id="pkg-images"
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              rows={2}
              placeholder={"One per line or comma-separated. Leave empty to use a default placeholder image."}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create package
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
