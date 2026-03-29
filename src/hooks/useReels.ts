import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReelWithStay {
  id: string;
  /** FK to stays.id (UUID) */
  stay_id: string;
  /** Public slug for /stay/... URLs */
  stay_public_slug: string;
  title: string;
  thumbnail: string;
  url: string;
  platform: string;
  stay_name: string;
}

export const reelsQueryKey = ["reels"] as const;

export async function fetchReels(): Promise<ReelWithStay[]> {
  const { data, error } = await supabase
    .from("stay_reels")
    .select("id, stay_id, title, thumbnail, url, platform, sort_order, stays!inner(name, stay_id)")
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch reels:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return (data || []).map((r: any) => {
    // stays may be returned as an array (Supabase !inner join) or a single object
    const stayRow = Array.isArray(r.stays) ? r.stays[0] : r.stays;
    return {
      id: r.id,
      stay_id: r.stay_id,
      stay_public_slug: (stayRow?.stay_id as string) || r.stay_id,
      title: r.title || "",
      thumbnail: r.thumbnail || "",
      url: r.url || "",
      platform: r.platform || "youtube",
      stay_name: stayRow?.name || "Resort",
    };
  });
}

export function useReels() {
  return useQuery({
    queryKey: reelsQueryKey,
    queryFn: fetchReels,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
