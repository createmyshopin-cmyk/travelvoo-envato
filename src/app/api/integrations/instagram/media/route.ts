import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";
import { decrypt } from "@/lib/encryption";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";

const TOKEN_KEY_ENV = "INSTAGRAM_TOKEN_ENCRYPTION_KEY";

/** GET: List recent Posts and Reels for the tenant's connected IG account. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = auth.slice(7);
  const sb = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: userData } = await sb.auth.getUser();
  if (!userData.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tenantId } = await sb.rpc("get_my_tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  const ent = await checkInstagramEntitlement(sb, tenantId);
  if (!ent.entitled) {
    return NextResponse.json({ error: ent.reason }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: conn } = await admin
    .from("tenant_instagram_connections")
    .select("instagram_business_account_id, page_access_token_encrypted, ig_username")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });
  }

  let pageToken: string;
  try {
    pageToken = decrypt(conn.page_access_token_encrypted, TOKEN_KEY_ENV);
  } catch {
    return NextResponse.json({ error: "Token decryption failed" }, { status: 500 });
  }

  const creds = await getMetaPlatformCredentials();
  const graphVersion = creds.graphApiVersion || "v25.0";
  const igId = conn.instagram_business_account_id;

  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/${igId}`);
  profileUrl.searchParams.set("fields", "id,username,profile_picture_url,name,media_count");
  profileUrl.searchParams.set("access_token", pageToken);

  const mediaUrl = new URL(`https://graph.facebook.com/${graphVersion}/${igId}/media`);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,children{media_type,media_url,thumbnail_url}",
  );
  mediaUrl.searchParams.set("limit", "50");
  mediaUrl.searchParams.set("access_token", pageToken);

  const [profileRes, mediaRes] = await Promise.all([fetch(profileUrl, { cache: "no-store" }), fetch(mediaUrl, { cache: "no-store" })]);

  const profileJson = (await profileRes.json().catch(() => ({}))) as {
    id?: string;
    username?: string;
    profile_picture_url?: string;
    name?: string;
    media_count?: number;
    error?: { message?: string };
  };
  const mediaJson = (await mediaRes.json().catch(() => ({}))) as { data?: unknown[]; error?: { message?: string } };

  if (mediaJson.error) {
    return NextResponse.json(
      {
        error: "Graph API error",
        detail: mediaJson.error.message ?? JSON.stringify(mediaJson.error),
        account: {
          id: igId,
          username: profileJson.username ?? conn.ig_username ?? null,
          profile_picture_url: profileJson.profile_picture_url ?? null,
          name: profileJson.name ?? null,
          media_count: profileJson.media_count ?? null,
        },
        media: [],
      },
      { status: 502 },
    );
  }

  const batchLen = Array.isArray(mediaJson.data) ? mediaJson.data.length : 0;
  const account = {
    id: profileJson.id ?? igId,
    username: profileJson.username ?? conn.ig_username ?? null,
    profile_picture_url: profileJson.profile_picture_url ?? null,
    name: profileJson.name ?? null,
    media_count: profileJson.media_count ?? (batchLen > 0 ? batchLen : null),
  };

  if (profileJson.error && !account.username) {
    account.username = conn.ig_username;
  }

  return NextResponse.json({
    account,
    media: mediaJson.data ?? [],
  });
}
