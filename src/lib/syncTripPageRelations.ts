import { supabase } from "@/integrations/supabase/client";

export type ItineraryRowInput = {
  dayNumber: number;
  title: string;
  description: string;
};

export type InclusionRowInput = {
  description: string;
  type: "included" | "excluded";
};

export type OtherInfoRowInput = {
  sectionTitle: string;
  items: string[];
};

/** Replace itinerary days for a trip (delete all, then insert). */
export async function replaceTripItineraryDays(tripId: string, rows: ItineraryRowInput[]) {
  const { error: delErr } = await (supabase.from("trip_itinerary_days") as any)
    .delete()
    .eq("trip_id", tripId);
  if (delErr) throw delErr;
  const clean = rows.filter((r) => r.title.trim() || r.description.trim());
  if (clean.length === 0) return;
  const insertRows = clean.map((r, i) => ({
    trip_id: tripId,
    day_number: r.dayNumber,
    title: r.title.trim(),
    description: r.description.trim(),
    sort_order: i,
  }));
  const { error: insErr } = await (supabase.from("trip_itinerary_days") as any).insert(insertRows);
  if (insErr) throw insErr;
}

/** Replace inclusions for a trip. */
export async function replaceTripInclusions(tripId: string, rows: InclusionRowInput[]) {
  const { error: delErr } = await (supabase.from("trip_inclusions") as any).delete().eq("trip_id", tripId);
  if (delErr) throw delErr;
  const clean = rows.filter((r) => r.description.trim());
  if (clean.length === 0) return;
  const insertRows = clean.map((r, i) => ({
    trip_id: tripId,
    description: r.description.trim(),
    type: r.type,
    sort_order: i,
  }));
  const { error: insErr } = await (supabase.from("trip_inclusions") as any).insert(insertRows);
  if (insErr) throw insErr;
}

/** Replace other-info sections for a trip. */
export async function replaceTripOtherInfo(tripId: string, rows: OtherInfoRowInput[]) {
  const { error: delErr } = await (supabase.from("trip_other_info") as any).delete().eq("trip_id", tripId);
  if (delErr) throw delErr;
  const clean = rows.filter((r) => r.sectionTitle.trim() || r.items.some((x) => x.trim()));
  if (clean.length === 0) return;
  const insertRows = clean.map((r, i) => ({
    trip_id: tripId,
    section_title: r.sectionTitle.trim(),
    items: r.items.map((x) => x.trim()).filter(Boolean),
    sort_order: i,
  }));
  const { error: insErr } = await (supabase.from("trip_other_info") as any).insert(insertRows);
  if (insErr) throw insErr;
}
