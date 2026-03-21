import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";
import { randomBytes } from "crypto";

/** Start Meta OAuth for the tenant admin. Redirects to Facebook OAuth dialog. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const tokenParam = req.nextUrl.searchParams.get("token");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : tokenParam;
  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${bearer}` } } },
  );

  const { data: userData } = await sb.auth.getUser();
  if (!userData.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tenantId } = await sb.rpc("get_my_tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  // Entitlement gate
  const ent = await checkInstagramEntitlement(sb, tenantId);
  if (!ent.entitled) {
    return NextResponse.json({ error: ent.reason || "Not entitled" }, { status: 403 });
  }

  const creds = await getMetaPlatformCredentials();
  if (!creds.metaAppId) {
    return NextResponse.json({ error: "Meta App ID not configured" }, { status: 503 });
  }

  const redirectUri = creds.oauthRedirectUri || `${req.nextUrl.origin}/api/integrations/instagram/callback`;
  const state = `${tenantId}:${randomBytes(16).toString("hex")}`;

  const scopes = [
    "instagram_basic",
    "instagram_manage_messages",
    "pages_manage_metadata",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const oauthUrl = `https://www.facebook.com/${creds.graphApiVersion}/dialog/oauth?` +
    new URLSearchParams({
      client_id: creds.metaAppId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: "code",
    }).toString();

  return NextResponse.redirect(oauthUrl);
}
