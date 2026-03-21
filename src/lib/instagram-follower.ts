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
  graphApiVersion: string = "v21.0",
): Promise<FollowerCheckResult> {
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

  // Attempt follower check via Graph API
  // This endpoint may not be available in all contexts — handle gracefully
  try {
    const url = `https://graph.facebook.com/${graphApiVersion}/${conn.instagram_business_account_id}?fields=business_discovery.fields(followers_count)&access_token=${pageToken}`;
    const res = await fetch(url);

    // The direct "does user X follow me" check is not straightforwardly
    // available in all Graph API versions. Fall back to unknown.
    if (!res.ok) {
      await upsertCache(sb, tenantId, senderIgId, null);
      return { follows: null, source: "error" };
    }

    // For now, since there's no reliable public endpoint for per-user follow check,
    // mark as unknown and let policy handle it
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
