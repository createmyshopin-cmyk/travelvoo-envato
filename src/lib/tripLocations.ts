import type { Trip } from "@/types/trip";

/** True if any pickup/drop text or map link is set */
export function tripHasAnyLocation(trip: Trip): boolean {
  const p = trip.pickupLocation?.trim();
  const d = trip.dropLocation?.trim();
  const mu = trip.pickupMapUrl?.trim();
  const du = trip.dropMapUrl?.trim();
  return !!(p || d || mu || du);
}

/** Short line for cards: "A → B" or single side */
export function tripLocationSummary(trip: Trip): string {
  const p = trip.pickupLocation?.trim();
  const d = trip.dropLocation?.trim();
  if (p && d) return `${p} → ${d}`;
  return p || d || "";
}
