import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { resolveEffectiveTenantId } from "@/lib/resolveEffectiveTenant";
import type {
  Trip,
  TripCustomTab,
  TripItineraryDay,
  TripDate,
  TripInclusion,
  TripOtherInfo,
  TripVideo,
  TripReview,
} from "@/types/trip";

function parseCustomTabs(raw: unknown): TripCustomTab[] {
  if (!Array.isArray(raw)) return [];
  const out: TripCustomTab[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : "";
    const body = typeof o.body === "string" ? o.body : "";
    if (!label.trim() && !body.trim()) continue;
    out.push({ label, body });
  }
  return out;
}

const fallbackImages = [
  "/assets/stay-1.jpg",
  "/assets/stay-2.jpg",
  "/assets/stay-3.jpg",
];

function mapDbTrip(row: any): Trip {
  const images =
    row.images?.length > 0
      ? row.images
      : [fallbackImages[Math.floor(Math.random() * fallbackImages.length)]];
  const legacyPickup = String(row.pickup_drop_location ?? "").trim();
  const pickup = String(row.pickup_location ?? "").trim() || legacyPickup;
  const drop = String(row.drop_location ?? "").trim();
  const pickupMap = String(row.pickup_map_url ?? "").trim();
  const dropMap = String(row.drop_map_url ?? "").trim();
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    durationNights: row.duration_nights,
    durationDays: row.duration_days,
    pickupLocation: pickup,
    dropLocation: drop,
    pickupMapUrl: pickupMap || null,
    dropMapUrl: dropMap || null,
    images,
    startingPrice: Number(row.starting_price),
    originalPrice: Number(row.original_price),
    discountLabel: row.discount_label,
    cancellationPolicy: Array.isArray(row.cancellation_policy)
      ? row.cancellation_policy
      : [],
    ctaHeading: row.cta_heading,
    ctaSubheading: row.cta_subheading,
    ctaImageUrl: row.cta_image_url,
    status: row.status,
    tenantId: row.tenant_id,
    minAdults: typeof row.min_adults === "number" ? row.min_adults : 1,
    maxAdults: typeof row.max_adults === "number" ? row.max_adults : 20,
    maxChildren: typeof row.max_children === "number" ? row.max_children : 10,
    defaultAdults: typeof row.default_adults === "number" ? row.default_adults : 2,
    customTabs: parseCustomTabs(row.custom_tabs),
  };
}

export function useTrips() {
  const { tenantId } = useTenant();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const effectiveTenantId = await resolveEffectiveTenantId(tenantId);

    let query = (supabase.from("trips") as any)
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (effectiveTenantId) {
      query = query.eq("tenant_id", effectiveTenantId);
    } else {
      query = query.is("tenant_id", null);
    }

    const { data } = await query;
    if (data) setTrips(data.map(mapDbTrip));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, refetch: fetchTrips };
}

export function useTripDetail(slug: string | undefined) {
  const { tenantId } = useTenant();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryDays, setItineraryDays] = useState<TripItineraryDay[]>([]);
  const [dates, setDates] = useState<TripDate[]>([]);
  const [inclusions, setInclusions] = useState<TripInclusion[]>([]);
  const [otherInfo, setOtherInfo] = useState<TripOtherInfo[]>([]);
  const [videos, setVideos] = useState<TripVideo[]>([]);
  const [reviews, setReviews] = useState<TripReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchAll = async () => {
      setLoading(true);

      const effectiveTenantId = await resolveEffectiveTenantId(tenantId);

      const { data: tripData } = await (supabase.from("trips") as any)
        .select("*")
        .eq("slug", slug)
        .single();

      if (!tripData) {
        setTrip(null);
        setLoading(false);
        return;
      }

      if (effectiveTenantId) {
        if (tripData.tenant_id !== effectiveTenantId) {
          setTrip(null);
          setLoading(false);
          return;
        }
      } else if (tripData.tenant_id != null) {
        setTrip(null);
        setLoading(false);
        return;
      }

      setTrip(mapDbTrip(tripData));

      const tripId = tripData.id;
      const [daysRes, datesRes, inclRes, infoRes, vidRes, revRes] =
        await Promise.all([
          (supabase.from("trip_itinerary_days") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order"),
          (supabase.from("trip_dates") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("start_date"),
          (supabase.from("trip_inclusions") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order"),
          (supabase.from("trip_other_info") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order"),
          (supabase.from("trip_videos") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order"),
          (supabase.from("trip_reviews") as any)
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order"),
        ]);

      if (daysRes.data)
        setItineraryDays(
          daysRes.data.map((r: any) => ({
            id: r.id,
            dayNumber: r.day_number,
            title: r.title,
            description: r.description ?? "",
            sortOrder: r.sort_order,
          }))
        );
      if (datesRes.data)
        setDates(
          datesRes.data.map((r: any) => ({
            id: r.id,
            startDate: r.start_date,
            endDate: r.end_date,
            price: Number(r.price),
            status: r.status,
          }))
        );
      if (inclRes.data)
        setInclusions(
          inclRes.data.map((r: any) => ({
            id: r.id,
            description: r.description,
            type: r.type,
            sortOrder: r.sort_order,
          }))
        );
      if (infoRes.data)
        setOtherInfo(
          infoRes.data.map((r: any) => ({
            id: r.id,
            sectionTitle: r.section_title,
            items: r.items ?? [],
            sortOrder: r.sort_order,
          }))
        );
      if (vidRes.data)
        setVideos(
          vidRes.data.map((r: any) => ({
            id: r.id,
            youtubeUrl: r.youtube_url,
            title: r.title ?? "",
            sortOrder: r.sort_order,
          }))
        );
      if (revRes.data)
        setReviews(
          revRes.data.map((r: any) => ({
            id: r.id,
            reviewerName: r.reviewer_name,
            reviewerAvatar: r.reviewer_avatar ?? "",
            reviewTitle: r.review_title,
            reviewText: r.review_text ?? "",
            reviewDate: r.review_date,
            sortOrder: r.sort_order,
          }))
        );

      setLoading(false);
    };

    fetchAll();
  }, [slug, tenantId]);

  return { trip, itineraryDays, dates, inclusions, otherInfo, videos, reviews, loading };
}
