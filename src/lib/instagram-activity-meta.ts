import type { Json } from "@/integrations/supabase/types";

/** Inbound DM text stored on instagram_channel_activity.meta for admin preview (truncated). */
export function getInboundPreviewFromMeta(meta: Json | null): string | null {
  if (meta == null || typeof meta !== "object" || Array.isArray(meta)) return null;
  const t = (meta as Record<string, unknown>).inbound_text;
  return typeof t === "string" && t.length > 0 ? t : null;
}
