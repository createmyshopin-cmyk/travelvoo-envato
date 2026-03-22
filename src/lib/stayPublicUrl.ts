import type { Stay } from "@/types/stay";

export function slugify(text: string | undefined): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the path segment is a stay row UUID (legacy / bookmarked links). */
export function looksLikeStayUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

/**
 * Path segment for `/stay/[segment]`: prefers human-readable `stayId` (DB `stay_id`), else UUID `id`.
 */
export function stayPublicSegment(stay: Pick<Stay, "id" | "stayId"> & Partial<Pick<Stay, "name" | "location">>): string {
  const slug = stay.stayId?.trim();
  if (slug) {
    const match = slug.match(/\d+/);
    const num = match ? match[0] : slug;
    
    const parts = [num];
    const nameSlug = slugify(stay.name);
    const locSlug = slugify(stay.location);
    
    if (nameSlug) parts.push(nameSlug);
    if (locSlug) parts.push(locSlug);
    
    return encodeURIComponent(parts.join("-"));
  }
  return stay.id;
}

export function stayPublicPath(stay: Pick<Stay, "id" | "stayId"> & Partial<Pick<Stay, "name" | "location">>): string {
  return `/stay/${stayPublicSegment(stay)}`;
}

export function stayPublicAbsoluteUrl(origin: string, stay: Pick<Stay, "id" | "stayId"> & Partial<Pick<Stay, "name" | "location">>): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${stayPublicPath(stay)}`;
}

/** For rows shaped like `{ id, stay_id }` from Supabase selects. */
export function stayPathFromIds(row: { id: string; stay_id: string; name?: string; location?: string }): string {
  return stayPublicPath({ id: row.id, stayId: row.stay_id, ...row });
}
