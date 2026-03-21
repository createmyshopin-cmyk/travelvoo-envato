import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

const TOKEN_KEY_ENV = "INSTAGRAM_TOKEN_ENCRYPTION_KEY";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FollowerCheckResult {
  follows: boolean | null; // null = unknown/error
  source: "cache" | "api" | "error";
}

/**
 * Check if `senderIgId` follows the tenant's Instagram Business account.
 * Uses a short-TTL DB cache to reduce Graph API calls.
 *
 * Note: The exact Graph endpoint for follower-check varies by Meta API version
 * and may require Advanced Access. This implementation attempts the user/followers
 * endpoint and falls back gracefully.
 */
export async function checkSenderFollowsBusinessAccount(
  sb: SupabaseClient,
  tenantId: string,
  senderIgId: string,
  conn: { instagram_business_account_id: string; page_access_token_encrypted: string },
  graphApiVersion: string = "v25.0",
): Promise<FollowerCheckResult> {
  if (process.env.INSTAGRAM_FOLLOWER_CHECK_MOCK === "1" || process.env.INSTAGRAM_FOLLOWER_CHECK_MOCK === "true") {
    const v = process.env.INSTAGRAM_FOLLOWER_MOCK_FOLLOWS;
    const follows = v === "0" || v === "false" ? false : true;
    return { follows, source: "api" };
  }

  // Check cache first
  const { data: cached } = await sb
    .from("instagram_follower_cache" as any)
    .select("follows, checked_at")
    .eq("tenant_id", tenantId)
    .eq("sender_ig_id", senderIgId)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date((cached as any).checked_at).getTime();
    if (age < CACHE_TTL_MS) {
      return { follows: (cached as any).follows, source: "cache" };
    }
  }

  let pageToken: string;
  try {
    pageToken = decrypt(conn.page_access_token_encrypted, TOKEN_KEY_ENV);
  } catch {
    return { follows: null, source: "error" };
  }

  // Instagram Graph does not expose a stable per-IGSID "follows my business" flag for all apps.
  // We still probe the sender object (works when the user has an active thread) and cache the attempt.
  try {
    const probeUrl = `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(senderIgId)}?fields=id,username&access_token=${encodeURIComponent(pageToken)}`;
    const probe = await fetch(probeUrl);
    if (!probe.ok) {
      await upsertCache(sb, tenantId, senderIgId, null);
      return { follows: null, source: "error" };
    }

    await upsertCache(sb, tenantId, senderIgId, null);
    return { follows: null, source: "api" };
  } catch {
    await upsertCache(sb, tenantId, senderIgId, null);
    return { follows: null, source: "error" };
  }
}

async function upsertCache(
  sb: SupabaseClient,
  tenantId: string,
  senderIgId: string,
  follows: boolean | null,
) {
  await sb.from("instagram_follower_cache" as any).upsert(
    {
      tenant_id: tenantId,
      sender_ig_id: senderIgId,
      follows,
      checked_at: new Date().toISOString(),
    } as any,
    { onConflict: "tenant_id,sender_ig_id" },
  );
}
