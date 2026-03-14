import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Stay, RoomCategory, Review, Reel, NearbyDestination } from "@/types/stay";

// Module-level cache so switching category tabs doesn't re-fetch already-loaded data
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

export function useStays(category?: string) {
  const cacheKey = category ?? "__all__";
  const [stays, setStays] = useState<Stay[]>(staysCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(!staysCache.has(cacheKey));

  const fetchStays = useCallback(async () => {
    const cached = staysCache.get(cacheKey);
    if (cached) { setStays(cached); setLoading(false); return; }

    setLoading(true);
    let query = supabase
      .from("stays")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

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
  }, [cacheKey, category]);

  useEffect(() => {
    fetchStays();
  }, [fetchStays]);

  return { stays, loading, refetch: fetchStays };
}

export function useStayDetail(stayId: string | undefined) {
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

      setLoading(false);
    };

    fetchAll();
  }, [stayId]);

  return { stay, roomCategories, reviews, reels, nearbyDestinations, loading };
}

export { mapDbStay };
