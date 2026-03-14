/**
 * Returns an absolute, compressed OG image URL for meta tags (WhatsApp, Facebook, etc.)
 * - Supabase storage URLs: use render API with width=1200, quality=80
 * - Relative paths: convert to absolute using origin
 * - External URLs: return as-is
 */
export function getOgImageUrl(rawUrl: string | undefined, origin?: string): string | undefined {
  if (!rawUrl || !rawUrl.trim()) return undefined;

  const trimmed = rawUrl.trim();

  // Supabase storage: convert to compressed render URL (Pro plan required)
  if (trimmed.includes(".supabase.co/storage/v1/object/public/")) {
    const base = trimmed.replace("/object/public/", "/render/image/public/");
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}width=1200&quality=80`;
  }

  // Relative path: make absolute
  if (trimmed.startsWith("/") && typeof origin === "string" && origin) {
    return `${origin.replace(/\/$/, "")}${trimmed}`;
  }

  // Already absolute (http/https)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return trimmed;
}
