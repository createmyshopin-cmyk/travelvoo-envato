"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  type ComponentType,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Save,
  Users,
  Clock,
  MapPin,
  Flag,
  Link2,
  ClipboardList,
  IndianRupee,
  Images,
  LayoutGrid,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { slugify } from "@/lib/slugify";
import { compressImage } from "@/lib/compressImage";
import { computePackageTimelineCompletion } from "@/lib/computePackageTimelineCompletion";
import { newPackageImageId, type PackageCoverImage } from "@/lib/packageCoverImage";
import type { TripBatchDraft } from "@/components/admin/AdminPackageTripDatesSection";
import { AdminPackagePreviewDialog } from "@/components/admin/AdminPackagePreviewDialog";
import {
  replaceTripItineraryDays,
  replaceTripInclusions,
  replaceTripOtherInfo,
} from "@/lib/syncTripPageRelations";
import {
  AdminPackageTripPageTabsEditor,
  type ItineraryDraft,
  type InclusionDraft,
  type OtherInfoDraft,
  type CustomTabDraft,
} from "@/components/admin/AdminPackageTripPageTabsEditor";

const AdminPackageCoverImagesField = dynamic(
  () =>
    import("@/components/admin/AdminPackageCoverImagesField").then((m) => ({
      default: m.AdminPackageCoverImagesField,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading cover images"
        className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/25"
      >
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface AdminPackageCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful create or update */
  onSaved: () => void;
  /** When set, dialog loads this trip and saves with UPDATE */
  editTripId?: string | null;
}

const defaultImages = ["/assets/stay-1.jpg"];

/** Number of timeline nodes (must match labels + form sections) */
const PACKAGE_FORM_TIMELINE_STEPS = 8;

const PACKAGE_TIMELINE_STEP_LABELS = [
  "Details",
  "Length",
  "Guests",
  "Pickup",
  "Price",
  "Trip page",
  "Images",
  "Save",
] as const;

function newDraftKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Horizontal stepper: nodes turn green + check when that section is complete; connectors follow the prior step */
const HorizontalPackageTimeline = memo(function HorizontalPackageTimeline({
  activeStep,
  onStepClick,
  completedSteps,
}: {
  activeStep: number;
  onStepClick: (step: number) => void;
  /** completedSteps[i] === step i+1 is done */
  completedSteps: boolean[];
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg border border-border/60 bg-muted/30 py-2.5 pl-2 pr-3 sm:px-3 sm:py-3",
        "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:thin] [touch-action:pan-x]",
        "[-webkit-overflow-scrolling:touch]"
      )}
      role="navigation"
      aria-label="Package form steps"
    >
      <div className="flex min-w-min items-start justify-start gap-0 sm:min-w-0 sm:w-full sm:justify-center">
        {PACKAGE_TIMELINE_STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isLast = step >= PACKAGE_FORM_TIMELINE_STEPS;
          const done = Boolean(completedSteps[i]);
          const nextDone = i + 1 < completedSteps.length ? Boolean(completedSteps[i + 1]) : false;
          const segmentAfterDone = Boolean(completedSteps[i]);
          return (
            <div key={step} className="flex min-w-0 items-start">
              <button
                type="button"
                onClick={() => onStepClick(step)}
                aria-current={step === activeStep ? "step" : undefined}
                aria-label={`${label}, step ${step}${step === activeStep ? ", current" : ""}${done ? ", completed" : ", not complete"}`}
                className={cn(
                  "group flex min-h-[44px] min-w-[3.25rem] max-w-[4.5rem] shrink-0 snap-center snap-always flex-col items-center justify-start rounded-lg px-1 py-1 text-center transition-colors active:bg-background/60 hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-0 sm:w-[4.25rem] sm:min-w-0 sm:max-w-none sm:px-0.5 sm:py-0.5",
                  step === activeStep && "rounded-xl bg-primary/10 ring-2 ring-primary/40 ring-offset-2 ring-offset-muted/30"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm transition-all duration-300 sm:h-9 sm:w-9 sm:text-sm",
                    done
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-900/15 dark:border-emerald-500 dark:bg-emerald-600"
                      : step === activeStep
                        ? "border-primary bg-primary text-primary-foreground shadow-md group-hover:bg-primary group-hover:text-primary-foreground"
                        : "border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.75} aria-hidden />
                  ) : (
                    step
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1 line-clamp-2 max-w-[3.75rem] text-[9px] font-medium leading-tight transition-colors sm:mt-1.5 sm:max-w-[4.25rem] sm:text-[10px]",
                    done
                      ? "text-emerald-700 dark:text-emerald-400"
                      : step === activeStep
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
              {!isLast ? (
                <div
                  className="flex h-8 shrink-0 items-center px-0.5 sm:h-9 sm:flex-1 sm:min-w-[0.35rem] sm:max-w-[2.5rem] sm:px-1"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-0.5 w-full min-w-[0.65rem] rounded-full transition-colors duration-300 sm:min-w-[0.75rem]",
                      segmentAfterDone && nextDone
                        ? "bg-emerald-500"
                        : segmentAfterDone
                          ? "bg-gradient-to-r from-emerald-500 via-emerald-400/50 to-border"
                          : "bg-gradient-to-r from-primary/45 via-primary/20 to-border"
                    )}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/** Renders one wizard step; inactive steps are unmounted (lighter DOM + lazy chunks load when visited). */
function WizardStepPanel({ step, activeStep, children }: { step: number; activeStep: number; children: ReactNode }) {
  if (step !== activeStep) return null;
  return (
    <div
      id={`pkg-form-step-${step}`}
      className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
    >
      {children}
    </div>
  );
}

/** Grouped block: header + padded body for admin long forms */
function AdminFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm overflow-hidden scroll-mt-4 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-2.5 border-b border-border/70 bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        {Icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-primary sm:h-9 sm:w-9"
            aria-hidden
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">{children}</div>
    </section>
  );
}

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
  const [minAdults, setMinAdults] = useState("1");
  const [maxAdults, setMaxAdults] = useState("20");
  const [maxChildren, setMaxChildren] = useState("10");
  const [defaultAdults, setDefaultAdults] = useState("2");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [pickupMapUrl, setPickupMapUrl] = useState("");
  const [dropMapUrl, setDropMapUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("active");
  /** Ordered cover gallery: first item = hero / listing cover */
  const [coverImages, setCoverImages] = useState<PackageCoverImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tripBatches, setTripBatches] = useState<TripBatchDraft[]>([]);
  const [itineraryDrafts, setItineraryDrafts] = useState<ItineraryDraft[]>([]);
  const [inclusionDrafts, setInclusionDrafts] = useState<InclusionDraft[]>([]);
  const [otherInfoDrafts, setOtherInfoDrafts] = useState<OtherInfoDraft[]>([]);
  const [customTabDrafts, setCustomTabDrafts] = useState<CustomTabDraft[]>([]);
  /** Wizard: one section at a time (1–8) */
  const [activeStep, setActiveStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isEdit = Boolean(editTripId);
  const packageIsPublished = Boolean(isEdit && editTripId && status === "active");

  const goToStep = useCallback((step: number) => {
    setActiveStep(Math.max(1, Math.min(PACKAGE_FORM_TIMELINE_STEPS, step)));
  }, []);

  const wizardBack = useCallback(() => {
    setActiveStep((s) => Math.max(1, s - 1));
  }, []);

  const wizardNext = useCallback(() => {
    setActiveStep((s) => Math.min(PACKAGE_FORM_TIMELINE_STEPS, s + 1));
  }, []);

  /** Per-step completion for timeline colors (index 0 = step 1) */
  const timelineStepComplete = useMemo(
    () =>
      computePackageTimelineCompletion({
        name,
        slug,
        durationNights,
        durationDays,
        minAdults,
        maxAdults,
        defaultAdults,
        maxChildren,
        pickupLocation,
        dropLocation,
        pickupMapUrl,
        dropMapUrl,
        startingPrice,
        originalPrice,
        tripBatchCount: tripBatches.length,
        coverImageCount: coverImages.length,
      }),
    [
      name,
      slug,
      durationNights,
      durationDays,
      minAdults,
      maxAdults,
      defaultAdults,
      maxChildren,
      pickupLocation,
      dropLocation,
      pickupMapUrl,
      dropMapUrl,
      startingPrice,
      originalPrice,
      tripBatches.length,
      coverImages.length,
    ]
  );

  const reset = useCallback(() => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setDurationNights("1");
    setDurationDays("2");
    setMinAdults("1");
    setMaxAdults("20");
    setMaxChildren("10");
    setDefaultAdults("2");
    setPickupLocation("");
    setDropLocation("");
    setPickupMapUrl("");
    setDropMapUrl("");
    setStartingPrice("");
    setOriginalPrice("");
    setDiscountLabel("");
    setStatus("active");
    setCoverImages([]);
    setTripBatches([]);
    setItineraryDrafts([]);
    setInclusionDrafts([]);
    setOtherInfoDrafts([]);
    setCustomTabDrafts([]);
    setActiveStep(1);
  }, []);

  useEffect(() => {
    if (open && !editTripId) {
      reset();
      setSlugTouched(false);
    }
  }, [open, editTripId, reset]);

  /** Wizard back to step 1 whenever the dialog is opened (avoids stale step from a previous session). */
  useEffect(() => {
    if (!open) return;
    setActiveStep(1);
  }, [open]);

  useEffect(() => {
    if (!open) setPreviewOpen(false);
  }, [open]);

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
      setMinAdults(String(data.min_adults ?? 1));
      setMaxAdults(String(data.max_adults ?? 20));
      setMaxChildren(String(data.max_children ?? 10));
      setDefaultAdults(String(data.default_adults ?? 2));
      const pl = String(data.pickup_location ?? "").trim();
      const dl = String(data.drop_location ?? "").trim();
      const legacy = String(data.pickup_drop_location ?? "").trim();
      if (pl || dl) {
        setPickupLocation(pl);
        setDropLocation(dl);
      } else {
        setPickupLocation(legacy);
        setDropLocation("");
      }
      setPickupMapUrl(data.pickup_map_url != null ? String(data.pickup_map_url) : "");
      setDropMapUrl(data.drop_map_url != null ? String(data.drop_map_url) : "");
      setStartingPrice(String(data.starting_price ?? ""));
      setOriginalPrice(
        data.original_price != null && Number(data.original_price) !== Number(data.starting_price)
          ? String(data.original_price)
          : ""
      );
      setDiscountLabel(data.discount_label ?? "");
      setStatus((data.status as "active" | "draft" | "archived") || "active");
      const imgs = Array.isArray(data.images) ? data.images : [];
      const urls = imgs.filter((u: unknown) => typeof u === "string" && (u as string).trim()) as string[];
      setCoverImages(urls.map((url) => ({ id: newPackageImageId(), url })));

      const tabsRaw = Array.isArray(data.custom_tabs) ? data.custom_tabs : [];
      setCustomTabDrafts(
        tabsRaw.map((t: unknown) => {
          const o = t && typeof t === "object" ? (t as Record<string, unknown>) : {};
          return {
            localKey: newDraftKey(),
            label: typeof o.label === "string" ? o.label : "",
            body: typeof o.body === "string" ? o.body : "",
          };
        })
      );

      const [
        { data: datesRows },
        { data: itRows },
        { data: incRows },
        { data: oiRows },
      ] = await Promise.all([
        (supabase.from("trip_dates") as any)
          .select("id, start_date, end_date, price, status")
          .eq("trip_id", editTripId)
          .order("start_date", { ascending: true }),
        (supabase.from("trip_itinerary_days") as any)
          .select("*")
          .eq("trip_id", editTripId)
          .order("sort_order", { ascending: true }),
        (supabase.from("trip_inclusions") as any)
          .select("*")
          .eq("trip_id", editTripId)
          .order("sort_order", { ascending: true }),
        (supabase.from("trip_other_info") as any)
          .select("*")
          .eq("trip_id", editTripId)
          .order("sort_order", { ascending: true }),
      ]);

      if (cancelled) return;

      if (datesRows?.length) {
        setTripBatches(
          datesRows.map((r: any) => ({
            localKey: r.id,
            id: r.id,
            startDate: r.start_date,
            endDate: r.end_date,
            price: Number(r.price) || 0,
            status: r.status as TripBatchDraft["status"],
          }))
        );
      } else {
        setTripBatches([]);
      }

      if (itRows?.length) {
        setItineraryDrafts(
          itRows.map((r: any) => ({
            localKey: r.id,
            id: r.id,
            dayNumber: typeof r.day_number === "number" ? r.day_number : 0,
            title: r.title ?? "",
            description: r.description ?? "",
          }))
        );
      } else {
        setItineraryDrafts([]);
      }

      if (incRows?.length) {
        setInclusionDrafts(
          incRows.map((r: any) => ({
            localKey: r.id,
            id: r.id,
            description: r.description ?? "",
            type: r.type === "excluded" ? "excluded" : "included",
          }))
        );
      } else {
        setInclusionDrafts([]);
      }

      if (oiRows?.length) {
        setOtherInfoDrafts(
          oiRows.map((r: any) => ({
            localKey: r.id,
            id: r.id,
            sectionTitle: r.section_title ?? "",
            itemsText: Array.isArray(r.items)
              ? (r.items as unknown[]).filter((x): x is string => typeof x === "string").join("\n")
              : "",
          }))
        );
      } else {
        setOtherInfoDrafts([]);
      }
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

  const parseImages = useCallback((): string[] => {
    return coverImages.length > 0 ? coverImages.map((c) => c.url) : defaultImages;
  }, [coverImages]);

  const handleImageFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const raw of Array.from(files)) {
        if (!raw.type.startsWith("image/")) continue;
        const file = await compressImage(raw, "stay");
        const ext = file.name.split(".").pop() || "jpg";
        const path = `trips/packages/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const { error } = await supabase.storage.from("stay-images").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("stay-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      if (urls.length) {
        setCoverImages((prev) => [...prev, ...urls.map((url) => ({ id: newPackageImageId(), url }))]);
        toast({ title: `${urls.length} image(s) uploaded` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    }
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [toast]);

  const syncTripDatesForTrip = useCallback(async (tripId: string, batches: TripBatchDraft[]) => {
    const { error: delErr } = await (supabase.from("trip_dates") as any).delete().eq("trip_id", tripId);
    if (delErr) throw delErr;
    if (batches.length === 0) return;
    const rows = batches.map((b) => ({
      trip_id: tripId,
      start_date: b.startDate,
      end_date: b.endDate,
      price: b.price,
      status: b.status,
    }));
    const { error: insErr } = await (supabase.from("trip_dates") as any).insert(rows);
    if (insErr) throw insErr;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const slugFinal = slugify(slug.trim() || name);
    if (!name.trim() || !slugFinal) {
      toast({
        title: "Name and trip page link are required",
        variant: "destructive",
      });
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

    const minA = Math.max(1, parseInt(minAdults, 10) || 1);
    const maxA = Math.max(minA, parseInt(maxAdults, 10) || minA);
    const maxC = Math.max(0, parseInt(maxChildren, 10) || 0);
    let defA = parseInt(defaultAdults, 10);
    if (Number.isNaN(defA)) defA = minA;
    defA = Math.min(maxA, Math.max(minA, defA));

    const normalizeMapUrl = (raw: string): string | null => {
      const t = raw.trim();
      if (!t) return null;
      if (/^https?:\/\//i.test(t)) return t;
      return `https://${t}`;
    };
    const pLoc = pickupLocation.trim();
    const dLoc = dropLocation.trim();
    const pMap = normalizeMapUrl(pickupMapUrl);
    const dMap = normalizeMapUrl(dropMapUrl);
    const legacyPickupDrop = [pLoc, dLoc].filter(Boolean).join(" → ");

    const customTabsPayload = customTabDrafts
      .filter((t) => t.label.trim() || t.body.trim())
      .map((t) => ({ label: t.label.trim(), body: t.body.trim() }));

    setSaving(true);
    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: platformRpc } = await supabase.rpc("get_platform_tenant_id");
    const resolvedTenantId = tenantId ?? platformRpc;

    const row: Record<string, unknown> = {
      slug: slugFinal,
      name: name.trim(),
      description: description.trim(),
      duration_nights: Math.max(0, parseInt(durationNights, 10) || 1),
      duration_days: Math.max(1, parseInt(durationDays, 10) || 2),
      pickup_location: pLoc,
      drop_location: dLoc,
      pickup_map_url: pMap,
      drop_map_url: dMap,
      pickup_drop_location: legacyPickupDrop,
      images: parseImages(),
      starting_price: start,
      original_price: orig,
      discount_label: discountLabel.trim() || null,
      status,
      min_adults: minA,
      max_adults: maxA,
      max_children: maxC,
      default_adults: defA,
      custom_tabs: customTabsPayload,
    };

    let error: { code?: string; message: string } | null = null;
    let savedTripId: string | null = isEdit ? editTripId : null;

    if (isEdit && editTripId) {
      const { error: upErr } = await (supabase.from("trips") as any)
        .update(row)
        .eq("id", editTripId);
      error = upErr;
    } else {
      const insertRow = {
        ...row,
        cancellation_policy: [],
        ...(resolvedTenantId != null ? { tenant_id: resolvedTenantId } : { tenant_id: null }),
      };
      const { data: inserted, error: insErr } = await (supabase.from("trips") as any)
        .insert(insertRow)
        .select("id")
        .single();
      error = insErr;
      if (inserted?.id) savedTripId = inserted.id as string;
    }

    if (!error && savedTripId) {
      try {
        await syncTripDatesForTrip(savedTripId, tripBatches);
        await replaceTripItineraryDays(
          savedTripId,
          itineraryDrafts
            .filter((d) => d.title.trim() || d.description.trim())
            .map((d) => ({
              dayNumber: d.dayNumber,
              title: d.title.trim(),
              description: d.description.trim(),
            }))
        );
        await replaceTripInclusions(
          savedTripId,
          inclusionDrafts
            .filter((r) => r.description.trim())
            .map((r) => ({ description: r.description.trim(), type: r.type }))
        );
        await replaceTripOtherInfo(
          savedTripId,
          otherInfoDrafts
            .map((s) => ({
              sectionTitle: s.sectionTitle.trim(),
              items: s.itemsText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            }))
            .filter((s) => s.sectionTitle || s.items.length > 0)
        );
      } catch (dErr: unknown) {
        const msg = dErr instanceof Error ? dErr.message : "Could not save dates or trip page content";
        toast({
          title: "Package saved; calendar or page tabs failed",
          description: msg,
          variant: "destructive",
        });
        setSaving(false);
        onSaved();
        if (!isEdit) reset();
        onOpenChange(false);
        return;
      }
    }

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "This trip link is already taken",
          description: "Choose a different ending for the address — another package already uses this one.",
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
  }, [
    name,
    slug,
    startingPrice,
    originalPrice,
    description,
    durationNights,
    durationDays,
    pickupLocation,
    dropLocation,
    pickupMapUrl,
    dropMapUrl,
    discountLabel,
    status,
    minAdults,
    maxAdults,
    maxChildren,
    defaultAdults,
    coverImages,
    tripBatches,
    isEdit,
    editTripId,
    toast,
    onOpenChange,
    onSaved,
    reset,
    parseImages,
    syncTripDatesForTrip,
    itineraryDrafts,
    inclusionDrafts,
    otherInfoDrafts,
    customTabDrafts,
  ]);

  const coverImageUrls = useMemo(() => coverImages.map((c) => c.url), [coverImages]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-h-[92vh] sm:max-w-4xl sm:gap-4 sm:p-6",
          "max-md:left-2 max-md:right-2 max-md:top-2 max-md:bottom-2 max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pb-1 pr-12 pt-3 text-left sm:px-0 sm:pb-0 sm:pr-10 sm:pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <DialogTitle className="text-left text-base leading-tight sm:text-lg">
              {isEdit ? "Edit package" : "Create package"}
            </DialogTitle>
            <span
              className="inline-flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary sm:text-[11px]"
              title="Complete sections in order — you can still save with optional fields empty"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              Step {activeStep}/{PACKAGE_FORM_TIMELINE_STEPS}
            </span>
          </div>
          <DialogDescription className="text-left text-xs leading-relaxed sm:text-sm">
            {isEdit ? (
              "Update this trip/package. Changing the trip page link changes the web address people use to open it."
            ) : (
              <>
                Adds a row to <code className="break-all rounded bg-muted px-0.5 text-[10px] sm:text-xs">trips</code>. It
                will appear on <code className="break-all rounded bg-muted px-0.5 text-[10px] sm:text-xs">/trips</code>{" "}
                and at <code className="break-all rounded bg-muted px-0.5 text-[10px] sm:text-xs">/trip/your-trip-link</code>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {loadingTrip ? (
          <div className="flex min-h-[min(40vh,16rem)] flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 shrink-0 animate-spin" />
            <p className="text-center text-sm">Loading package…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2 pt-0 [-webkit-overflow-scrolling:touch] sm:px-0 sm:pb-2",
                "[contain:layout]",
                "[&_input]:min-h-10 [&_input]:text-base sm:[&_input]:text-sm",
                "[&_textarea]:min-h-[88px] [&_textarea]:text-base sm:[&_textarea]:text-sm"
              )}
            >
              <div className="relative mt-1 space-y-3 rounded-xl border border-dashed border-border/50 bg-gradient-to-b from-muted/25 via-muted/10 to-transparent px-2 py-3 sm:mt-2 sm:space-y-4 sm:px-4 sm:py-5">
            <div className="space-y-2">
              <HorizontalPackageTimeline
                activeStep={activeStep}
                onStepClick={goToStep}
                completedSteps={timelineStepComplete}
              />
              <p className="px-0.5 text-center text-[10px] leading-relaxed text-muted-foreground sm:px-1 sm:text-[11px]">
                <span className="font-semibold text-foreground">Step-by-step</span> — use{" "}
                <span className="font-medium text-foreground">Next / Back</span> in the footer (on the last step you’ll
                see Save / Create). Tap the timeline to jump. Green checks mean that section looks complete.
              </p>
            </div>

            <div className="space-y-3 pt-0.5 sm:space-y-5 sm:pt-1">
            <WizardStepPanel step={1} activeStep={activeStep}>
          <AdminFormSection
            title="Package details"
            description="Name, trip page link, and short copy appear on /trips and the public trip page."
            icon={ClipboardList}
          >
            <div className="space-y-2">
              <Label htmlFor="pkg-name">Package name *</Label>
              <Input
                id="pkg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coorg Weekend Escape"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-slug">Trip page link *</Label>
              <Input
                id="pkg-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="coorg-weekend-escape"
                className="font-mono text-sm h-10"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Short text for the address bar — only letters, numbers, and hyphens. Example:{" "}
                <span className="font-mono text-foreground/80">/trip/coorg-weekend</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-desc">Description</Label>
              <Textarea
                id="pkg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short summary for listings and SEO"
                className="min-h-[88px] resize-y"
              />
            </div>
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={2} activeStep={activeStep}>
          <AdminFormSection
            title="Trip length"
            description="Used in the hero and listings (e.g. 1 night · 2 days)."
            icon={Clock}
          >
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="pkg-nights">Nights</Label>
                <Input
                  id="pkg-nights"
                  type="number"
                  min={0}
                  value={durationNights}
                  onChange={(e) => setDurationNights(e.target.value)}
                  className="h-10"
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
                  className="h-10"
                />
              </div>
            </div>
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={3} activeStep={activeStep}>
          <AdminFormSection
            title="Booking & guests"
            description="Controls the adult/child steppers on the public “Book” dialog. Default adults is adjusted to fit min–max when you save."
            icon={Users}
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Adults
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pkg-min-adults" className="text-xs">
                      Minimum
                    </Label>
                    <Input
                      id="pkg-min-adults"
                      type="number"
                      min={1}
                      value={minAdults}
                      onChange={(e) => setMinAdults(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pkg-max-adults" className="text-xs">
                      Maximum
                    </Label>
                    <Input
                      id="pkg-max-adults"
                      type="number"
                      min={1}
                      value={maxAdults}
                      onChange={(e) => setMaxAdults(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pkg-default-adults" className="text-xs">
                      Pre-selected
                    </Label>
                    <Input
                      id="pkg-default-adults"
                      type="number"
                      min={1}
                      value={defaultAdults}
                      onChange={(e) => setDefaultAdults(e.target.value)}
                      title="Shown when guest opens Book"
                      className="h-10"
                    />
                    <p className="text-[11px] text-muted-foreground">Opening value in book flow</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Children
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="pkg-max-children" className="text-xs">
                      Max per booking
                    </Label>
                    <Input
                      id="pkg-max-children"
                      type="number"
                      min={0}
                      value={maxChildren}
                      onChange={(e) => setMaxChildren(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={4} activeStep={activeStep}>
          <AdminFormSection
            title="Pickup & drop-off"
            description="Guests see these on the trip page and in booking details. Paste a Google Maps share link for each point if you like."
            icon={MapPin}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Pickup
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-pickup-loc" className="text-xs">
                    Location name
                  </Label>
                  <Input
                    id="pkg-pickup-loc"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Majestic Bus Stand, Bangalore"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-pickup-map" className="text-xs flex items-center gap-1.5">
                    <Link2 className="h-3 w-3 text-muted-foreground" aria-hidden />
                    Map link (optional)
                  </Label>
                  <Input
                    id="pkg-pickup-map"
                    type="url"
                    inputMode="url"
                    value={pickupMapUrl}
                    onChange={(e) => setPickupMapUrl(e.target.value)}
                    placeholder="maps.app.goo.gl/… or maps.google.com/…"
                    className="h-10 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Flag className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  Drop-off
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-drop-loc" className="text-xs">
                    Location name
                  </Label>
                  <Input
                    id="pkg-drop-loc"
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    placeholder="e.g. Resort / city center"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-drop-map" className="text-xs flex items-center gap-1.5">
                    <Link2 className="h-3 w-3 text-muted-foreground" aria-hidden />
                    Map link (optional)
                  </Label>
                  <Input
                    id="pkg-drop-map"
                    type="url"
                    inputMode="url"
                    value={dropMapUrl}
                    onChange={(e) => setDropMapUrl(e.target.value)}
                    placeholder="maps.google.com/…"
                    className="h-10 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Links open in a new tab for guests. If you omit <code className="text-[10px] px-1 py-0.5 rounded bg-muted">https://</code>, it is added when you save.
            </p>
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={5} activeStep={activeStep}>
          <AdminFormSection
            title="Pricing & visibility"
            description="Starting price shows on listings; original price powers strike-through when higher."
            icon={IndianRupee}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-orig">Original / list price</Label>
                <Input
                  id="pkg-orig"
                  type="number"
                  min={0}
                  step="1"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="Leave empty to hide strike-through"
                  className="h-10"
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
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Package status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "draft" | "archived")}
              >
                <SelectTrigger className="h-10 w-full sm:max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active — visible on site</SelectItem>
                  <SelectItem value="draft">Draft — hidden from public</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={6} activeStep={activeStep}>
          <AdminFormSection
            title="Trip page tabs"
            description="Same tabs guests see on the public trip page: itinerary, dates & pricing, inclusions, other info — plus optional custom tabs."
            icon={LayoutGrid}
          >
            <AdminPackageTripPageTabsEditor
              durationDays={Math.max(1, parseInt(durationDays, 10) || 2)}
              tripBatches={tripBatches}
              onTripBatchesChange={setTripBatches}
              basePriceHint={
                parseFloat(startingPrice) >= 0 && !Number.isNaN(parseFloat(startingPrice))
                  ? parseFloat(startingPrice)
                  : 0
              }
              itinerary={itineraryDrafts}
              onItineraryChange={setItineraryDrafts}
              inclusions={inclusionDrafts}
              onInclusionsChange={setInclusionDrafts}
              otherSections={otherInfoDrafts}
              onOtherSectionsChange={setOtherInfoDrafts}
              customTabs={customTabDrafts}
              onCustomTabsChange={setCustomTabDrafts}
            />
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={7} activeStep={activeStep}>
          <AdminFormSection
            title="Cover images"
            description="First image is the hero on listings and the trip page. Drag to reorder."
            icon={Images}
          >
            <AdminPackageCoverImagesField
              items={coverImages}
              onChange={setCoverImages}
              uploading={uploadingImages}
              fileInputRef={fileInputRef}
              onFilesSelected={handleImageFiles}
            />
          </AdminFormSection>
            </WizardStepPanel>

            <WizardStepPanel step={8} activeStep={activeStep}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-foreground shadow-sm sm:px-4 sm:py-4">
            <p className="font-semibold leading-snug">Ready to save</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              Use <span className="font-semibold text-foreground">Save changes</span> or{" "}
              <span className="font-semibold text-foreground">Create package</span> in the footer to finish. Active
              packages appear on your public trips listing; drafts stay hidden until you switch status to active.
            </p>
          </div>
            </WizardStepPanel>
            </div>
              </div>
            </div>

            <DialogFooter className="mt-auto flex shrink-0 flex-col gap-2 border-t border-border/60 bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:space-x-0 sm:bg-transparent sm:px-0 sm:py-4 sm:pb-4 sm:pt-4 sm:backdrop-blur-none">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Preview package
            </Button>
            {activeStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
                onClick={wizardBack}
              >
                <ChevronLeft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Back
              </Button>
            ) : null}
            {activeStep < PACKAGE_FORM_TIMELINE_STEPS ? (
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
                onClick={wizardNext}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" disabled={saving} className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto">
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
            )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    <AdminPackagePreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      packageIsPublished={packageIsPublished}
      name={name}
      slug={slug}
      description={description}
      durationNights={durationNights}
      durationDays={durationDays}
      pickupLocation={pickupLocation}
      dropLocation={dropLocation}
      pickupMapUrl={pickupMapUrl}
      dropMapUrl={dropMapUrl}
      startingPrice={startingPrice}
      originalPrice={originalPrice}
      discountLabel={discountLabel}
      minAdults={minAdults}
      maxAdults={maxAdults}
      maxChildren={maxChildren}
      defaultAdults={defaultAdults}
      coverImageUrls={coverImageUrls}
      tripBatches={tripBatches}
      itineraryDrafts={itineraryDrafts}
      inclusionDrafts={inclusionDrafts}
      otherInfoDrafts={otherInfoDrafts}
      customTabDrafts={customTabDrafts}
    />
    </>
  );
}
