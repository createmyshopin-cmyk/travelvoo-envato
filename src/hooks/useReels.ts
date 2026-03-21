import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReelWithStay {
  id: string;
  stay_id: string;
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
    .select("id, stay_id, title, thumbnail, url, platform, sort_order, stays!inner(name)")
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

  return (data || []).map((r: any) => ({
    id: r.id,
    stay_id: r.stay_id,
    title: r.title || "",
    thumbnail: r.thumbnail || "",
    url: r.url || "",
    platform: r.platform || "youtube",
    stay_name: r.stays?.name || "Resort",
  }));
}

export function useReels() {
  return useQuery({
    queryKey: reelsQueryKey,
    queryFn: fetchReels,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
