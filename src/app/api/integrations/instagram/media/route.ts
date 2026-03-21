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
    .from("tenant_instagram_connections" as any)
    .select("instagram_business_account_id, page_access_token_encrypted")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 404 });
  }

  let pageToken: string;
  try {
    pageToken = decrypt((conn as any).page_access_token_encrypted, TOKEN_KEY_ENV);
  } catch {
    return NextResponse.json({ error: "Token decryption failed" }, { status: 500 });
  }

  const creds = await getMetaPlatformCredentials();
  const graphVersion = creds.graphApiVersion || "v21.0";
  const igId = (conn as any).instagram_business_account_id;

  const mediaRes = await fetch(
    `https://graph.facebook.com/${graphVersion}/${igId}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url&limit=50&access_token=${pageToken}`,
  );

  if (!mediaRes.ok) {
    const err = await mediaRes.text();
    return NextResponse.json({ error: "Graph API error", detail: err }, { status: 502 });
  }

  const mediaData = (await mediaRes.json()) as { data?: any[] };
  return NextResponse.json({ media: mediaData.data ?? [] });
}
