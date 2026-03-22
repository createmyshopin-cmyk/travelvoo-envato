import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { getPlatformTenantId } from "@/lib/platformTenant";
import type { Stay, RoomCategory, Review, Reel, NearbyDestination } from "@/types/stay";

// Module-level cache: key = "tenantId|category" so tenant subdomains get fresh empty data
const staysCache = new Map<string, Stay[]>();

// Fallback images when DB images are empty
const fallbackImages = [
  "/assets/stay-1.jpg", "/assets/stay-2.jpg", "/assets/stay-3.jpg",
  "/assets/stay-4.jpg", "/assets/stay-5.jpg", "/assets/stay-6.jpg",
  "/assets/stay-7.jpg", "/assets/stay-8.jpg",
];

function mapDbStay(row: any): Stay {
  const images = row.images?.length > 0 ? row.images : [fallbackImages[Math.floor(Math.random() * fallbackImages.length)]];
  return {
    id: row.id,
    stayId: row.stay_id,
    name: row.name,
    location: row.location,
    price: row.price,
    originalPrice: row.original_price,
    image: images[0],
    images,
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
  return {
    id: row.id,
    name: row.guest_name,
    avatar: row.avatar_url || "",
    rating: row.rating,
    text: row.comment,
    photos: row.photos || [],
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
  const { tenantId } = useTenant();
  const [stay, setStay] = useState<Stay | null>(null);
  const [roomCategories, setRoomCategories] = useState<RoomCategory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [nearbyDestinations, setNearbyDestinations] = useState<NearbyDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stayId) return;

    const fetchAll = async () => {
      setLoading(true);

      const { data: stayData } = await supabase
        .from("stays")
        .select("*")
        .eq("id", stayId)
        .single();

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

      setLoading(false);
    };

    fetchAll();
  }, [stayId, tenantId]);

  return { stay, roomCategories, reviews, reels, nearbyDestinations, loading };
}

export { mapDbStay };
