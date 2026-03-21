import { slugify } from "@/lib/slugify";
import type {
  Trip,
  TripDate,
  TripItineraryDay,
  TripInclusion,
  TripOtherInfo,
  TripCustomTab,
} from "@/types/trip";

const fallbackImages = ["/assets/stay-1.jpg"];

/** Minimal batch shape for preview (matches TripBatchDraft fields used here). */
export type PreviewTripBatchInput = {
  startDate: string;
  endDate: string;
  price: number;
  status: TripDate["status"];
};

export type PreviewItineraryInput = {
  dayNumber: number;
  title: string;
  description: string;
};

export type PreviewInclusionInput = {
  description: string;
  type: TripInclusion["type"];
};

export type PreviewOtherInfoInput = {
  sectionTitle: string;
  /** One bullet per line */
  itemsText: string;
};

export type PreviewCustomTabInput = {
  label: string;
  body: string;
};

function normalizeMapUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Build a Trip + dates for admin preview from unsaved form fields. */
export function buildPackagePreviewTrip(fields: {
  name: string;
  slug: string;
  description: string;
  durationNights: string;
  durationDays: string;
  pickupLocation: string;
  dropLocation: string;
  pickupMapUrl: string;
  dropMapUrl: string;
  startingPrice: string;
  originalPrice: string;
  discountLabel: string;
  minAdults: string;
  maxAdults: string;
  maxChildren: string;
  defaultAdults: string;
  coverImageUrls: string[];
  tripBatches: PreviewTripBatchInput[];
  itineraryDays?: PreviewItineraryInput[];
  inclusions?: PreviewInclusionInput[];
  otherSections?: PreviewOtherInfoInput[];
  customTabs?: PreviewCustomTabInput[];
}): {
  trip: Trip;
  dates: TripDate[];
  itineraryDays: TripItineraryDay[];
  inclusions: TripInclusion[];
  otherInfo: TripOtherInfo[];
  customTabs: TripCustomTab[];
} {
  const slugFinal = slugify(fields.slug.trim() || fields.name) || "preview-package";
  const start = parseFloat(fields.startingPrice);
  const orig =
    fields.originalPrice.trim() === "" ? start : parseFloat(fields.originalPrice);
  const starting = Number.isNaN(start) ? 0 : Math.max(0, start);
  const original = Number.isNaN(orig) ? starting : Math.max(0, orig);

  const minA = Math.max(1, parseInt(fields.minAdults, 10) || 1);
  const maxA = Math.max(minA, parseInt(fields.maxAdults, 10) || minA);
  const maxC = Math.max(0, parseInt(fields.maxChildren, 10) || 0);
  let defA = parseInt(fields.defaultAdults, 10);
  if (Number.isNaN(defA)) defA = minA;
  defA = Math.min(maxA, Math.max(minA, defA));

  const nights = Math.max(0, parseInt(fields.durationNights, 10) || 1);
  const days = Math.max(1, parseInt(fields.durationDays, 10) || 2);

  const imgs =
    fields.coverImageUrls.length > 0 ? fields.coverImageUrls : [...fallbackImages];

  const customTabsPreview: TripCustomTab[] = (fields.customTabs ?? [])
    .map((t) => ({
      label: t.label.trim(),
      body: t.body.trim(),
    }))
    .filter((t) => t.label || t.body);

  const trip: Trip = {
    id: "preview",
    slug: slugFinal,
    name: fields.name.trim() || "Untitled package",
    description: fields.description.trim(),
    durationNights: nights,
    durationDays: days,
    pickupLocation: fields.pickupLocation.trim(),
    dropLocation: fields.dropLocation.trim(),
    pickupMapUrl: normalizeMapUrl(fields.pickupMapUrl),
    dropMapUrl: normalizeMapUrl(fields.dropMapUrl),
    images: imgs,
    startingPrice: starting,
    originalPrice: original,
    discountLabel: fields.discountLabel.trim() || null,
    cancellationPolicy: [],
    ctaHeading: null,
    ctaSubheading: null,
    ctaImageUrl: null,
    status: "active",
    tenantId: null,
    minAdults: minA,
    maxAdults: maxA,
    maxChildren: maxC,
    defaultAdults: defA,
    customTabs: customTabsPreview,
  };

  const dates: TripDate[] = fields.tripBatches.map((b, i) => ({
    id: `preview-date-${i}`,
    startDate: b.startDate,
    endDate: b.endDate,
    price: b.price,
    status: b.status,
  }));

  const itinerarySource = fields.itineraryDays ?? [];
  const itineraryDays: TripItineraryDay[] = itinerarySource
    .filter((d) => d.title.trim() || d.description.trim())
    .map((d, i) => ({
      id: `preview-day-${i}`,
      dayNumber: d.dayNumber,
      title: d.title.trim() || `Day ${d.dayNumber}`,
      description: d.description.trim(),
      sortOrder: i,
    }));

  const inclusionSource = fields.inclusions ?? [];
  const inclusions: TripInclusion[] = inclusionSource
    .filter((r) => r.description.trim())
    .map((r, i) => ({
      id: `preview-inc-${i}`,
      description: r.description.trim(),
      type: r.type,
      sortOrder: i,
    }));

  const otherSource = fields.otherSections ?? [];
  const otherInfo: TripOtherInfo[] = otherSource
    .map((s, i) => ({
      id: `preview-other-${i}`,
      sectionTitle: s.sectionTitle.trim(),
      items: s.itemsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      sortOrder: i,
    }))
    .filter((s) => s.sectionTitle || s.items.length > 0);

  return {
    trip,
    dates,
    itineraryDays,
    inclusions,
    otherInfo,
    customTabs: customTabsPreview,
  };
}
