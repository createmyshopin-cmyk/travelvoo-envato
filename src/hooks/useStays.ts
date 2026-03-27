import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { getPlatformTenantId } from "@/lib/platformTenant";
import { looksLikeStayUuid, stayPublicSegment } from "@/lib/stayPublicUrl";
import type { Stay, RoomCategory, Review, Reel, NearbyDestination } from "@/types/stay";

// Module-level cache: key = "tenantId|category" so tenant subdomains get fresh empty data
const staysCache = new Map<string, Stay[]>();

// Lightweight inline fallback to avoid 404s across environments.
const fallbackImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <rect width="1200" height="800" fill="#eef2ff"/>
      <rect x="40" y="40" width="1120" height="720" rx="24" fill="#e2e8f0"/>
      <text x="600" y="410" text-anchor="middle" fill="#64748b" font-size="42" font-family="Arial, sans-serif">
        Image unavailable
      </text>
    </svg>`
  );

const normalizeImageValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const v = value.trim();
    if (!v || v === "[object Object]") return null;
    return v;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [obj.url, obj.src, obj.image, obj.image_url, obj.publicUrl];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim() && candidate !== "[object Object]") {
        return candidate.trim();
      }
    }
  }

  return null;
};

const normalizeImageList = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return images.map(normalizeImageValue).filter((v): v is string => Boolean(v));
};

function mapDbStay(row: any): Stay {
  const images = normalizeImageList(row.images);
  const safeImages = images.length > 0 ? images : [fallbackImage];
  return {
    id: row.id,
    stayId: row.stay_id,
    name: row.name,
    location: row.location,
    price: row.price,
    originalPrice: row.original_price,
    image: safeImages[0],
    images: safeImages,
    category: row.category,
    rating: Number(row.rating),
    reviews: row.reviews_count,
    description: row.description,
    amenities: row.amenities || [],
    status: row.status,
    tenantId: row.tenant_id,
    cooldownMinutes: row.cooldown_minutes ?? 1440,
    maxAdults: row.max_adults ?? 20,
    maxChildren: row.max_children ?? 5,
    maxPets: row.max_pets ?? 5,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    ogImageUrl: row.og_image_url,
  };
}

function mapDbRoom(row: any): RoomCategory {
  return {
    id: row.id,
    name: row.name,
    images: row.images || [],
    maxGuests: row.max_guests,
    available: row.available,
    amenities: row.amenities || [],
    price: row.price,
    originalPrice: row.original_price,
  };
}

function mapDbReview(row: any): Review {
  const photos = normalizeImageList(row.photos);
  return {
    id: row.id,
    name: row.guest_name,
    avatar: row.avatar_url || "",
    rating: row.rating,
    text: row.comment,
    photos,
  };
}

// Local date (YYYY-MM-DD) — calendar_pricing uses local dates; UTC caused mismatches for Indian timezone
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function useStays(category?: string) {
  const { tenantId } = useTenant();
  const cacheKey = `${tenantId ?? "platform"}|${category ?? "__all__"}`;
  const [stays, setStays] = useState<Stay[]>(staysCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(!staysCache.has(cacheKey));
  const [calendarPriceMap, setCalendarPriceMap] = useState<Record<string, number>>({});
  const staysRef = useRef<Stay[]>([]);
  staysRef.current = stays;

  const fetchStays = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("stays")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Filter by tenant: on tenant subdomain only show their stays (fresh accounts = empty)
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    } else {
      const pid = await getPlatformTenantId();
      query = pid ? query.eq("tenant_id", pid) : query.is("tenant_id", null);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data } = await query;
    if (data) {
      const mapped = data.map(mapDbStay);
      staysCache.set(cacheKey, mapped);
      setStays(mapped);
    }
    setLoading(false);
  }, [cacheKey, category, tenantId]);

  const fetchCalendarMinPrices = useCallback(async (stayIds: string[]) => {
    if (stayIds.length === 0) return;
    const today = todayStr();
    // Query next 14 days — "From" price uses nearest available calendar rate
    const dates: string[] = [];
    const d = new Date();
    for (let i = 0; i < 14; i++) {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + i);
      dates.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
    }
    const { data } = await supabase
      .from("calendar_pricing")
      .select("stay_id, price, date")
      .in("stay_id", stayIds)
      .in("date", dates)
      .eq("is_blocked", false)
      .gte("price", 100)
      .lte("price", 100000);
    if (!data || data.length === 0) {
      setCalendarPriceMap({});
      return;
    }
    const map: Record<string, number> = {};
    for (const row of data) {
      const id = row.stay_id;
      if (!map[id] || row.price < map[id]) map[id] = row.price;
    }
    setCalendarPriceMap(map);
  }, []);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  useEffect(() => {
    if (stays.length === 0) return;
    fetchCalendarMinPrices(stays.map((s) => s.id));
  }, [stays, fetchCalendarMinPrices]);

  // Periodic refetch so prices update even if realtime misses (e.g. tab inactive)
  useEffect(() => {
    if (stays.length === 0) return;
    const interval = setInterval(() => {
      fetchCalendarMinPrices(staysRef.current.map((s) => s.id));
    }, 30_000);
    return () => clearInterval(interval);
  }, [stays.length, fetchCalendarMinPrices]);

  useEffect(() => {
    const channel = supabase
      .channel(`stays-cal-${cacheKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_pricing" }, () => {
        const current = staysRef.current;
        if (current.length > 0) fetchCalendarMinPrices(current.map((s) => s.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCalendarMinPrices, cacheKey]);

  const staysWithCalendarPrices = stays.map((s) => {
    const calPrice = calendarPriceMap[s.id];
    return calPrice != null ? { ...s, price: calPrice } : s;
  });

  return { stays: staysWithCalendarPrices, loading, refetch: fetchStays };
}

export function useStayDetail(stayId: string | undefined) {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [stay, setStay] = useState<Stay | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [nearbyDestinations, setNearbyDestinations] = useState<NearbyDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stayId) {
      setStay(null);
      setRoomCategories([]);
      setReviews([]);
      setReels([]);
      setNearbyDestinations([]);
      setLoading(false);
      return;
    }

    // Wait until hostname → tenant is resolved; otherwise tenantId is null and we
    // wrongly treat the page as "platform" and reject tenant stays (or spin forever).
    if (tenantLoading) {
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setStay(null);
      setRoomCategories([]);
      setReviews([]);
      setReels([]);
      setNearbyDestinations([]);

      try {
        const key = decodeURIComponent(stayId.trim());
        let stayData;
        if (looksLikeStayUuid(key)) {
          const { data } = await supabase.from("stays").select("*").eq("id", key).maybeSingle();
          stayData = data;
        } else {
          const tenantFilterId = tenantId ?? (await getPlatformTenantId());
          const stayIdCandidates = new Set<string>([key]);
          const match = key.match(/^(\d+)(?:-|$)/);
          if (match) {
            const num = match[1];
            stayIdCandidates.add(num);
            stayIdCandidates.add(`stay-${num}`);
            stayIdCandidates.add(`Stay-${num}`);
          }

          let q = supabase.from("stays").select("*").in("stay_id", Array.from(stayIdCandidates));
          if (tenantFilterId) q = q.eq("tenant_id", tenantFilterId);
          const { data } = await q.limit(1).maybeSingle();
          stayData = data ?? null;

          // Fallback for pretty public segments (e.g. STAY-MN72W90Q -> /stay/72-...)
          // where reverse-mapping to exact stay_id is lossy.
          if (!stayData) {
            let fallbackQ = supabase.from("stays").select("id, stay_id, name, location, tenant_id");
            if (tenantFilterId) fallbackQ = fallbackQ.eq("tenant_id", tenantFilterId);
            const { data: rows } = await fallbackQ.limit(200);
            const bySegment = (rows || []).find((r: any) =>
              stayPublicSegment({
                id: r.id,
                stayId: r.stay_id,
                name: r.name,
                location: r.location,
              }) === key
            );
            stayData = bySegment ?? null;
          }
        }

        if (stayData) {
          const platformId = await getPlatformTenantId();
          const allowed =
            tenantId != null
              ? stayData.tenant_id === tenantId
              : platformId != null && stayData.tenant_id === platformId;

          if (!allowed) {
            setStay(null);
          } else {
            setStay(mapDbStay(stayData));
            const [roomsRes, reviewsRes, reelsRes, nearbyRes] = await Promise.all([
              supabase.from("room_categories").select("*").eq("stay_id", stayData.id),
              supabase.from("reviews").select("*").eq("stay_id", stayData.id).eq("status", "approved").order("created_at", { ascending: false }),
              supabase.from("stay_reels").select("*").eq("stay_id", stayData.id).order("sort_order"),
              supabase.from("nearby_destinations").select("*").eq("stay_id", stayData.id).order("sort_order"),
            ]);
            if (roomsRes.data) setRoomCategories(roomsRes.data.map(mapDbRoom));
            if (reviewsRes.data) setReviews(reviewsRes.data.map(mapDbReview));
            if (reelsRes.data) setReels(reelsRes.data.map(r => ({ title: r.title, thumbnail: r.thumbnail, url: r.url, platform: r.platform as Reel["platform"] })));
            if (nearbyRes.data) setNearbyDestinations(nearbyRes.data.map(n => ({ name: n.name, image: n.image, distance: n.distance })));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, [stayId, tenantId, tenantLoading]);

  return { stay, roomCategories, reviews, reels, nearbyDestinations, loading };
}

export { mapDbStay };
