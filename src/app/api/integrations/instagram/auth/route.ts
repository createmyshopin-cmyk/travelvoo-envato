import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";
import { randomBytes } from "crypto";

type AuthResult =
  | { ok: false; response: NextResponse }
  | { ok: true; url: string };

/**
 * Shared OAuth URL build for GET (redirect) and POST (JSON { url }).
 * fetch() + redirect:manual breaks cross-origin 302 (opaque response / status 0) — use POST + JSON for the SPA.
 */
async function instagramAuth(req: NextRequest): Promise<AuthResult> {
  const auth = req.headers.get("authorization");
  const tokenParam = req.nextUrl.searchParams.get("token");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : tokenParam;
  if (!bearer) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const sb = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data: userData, error: authError } = await sb.auth.getUser(bearer);
  if (authError || !userData.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: tenantId } = await sb.rpc("get_my_tenant_id");
  if (!tenantId) {
    return { ok: false, response: NextResponse.json({ error: "No tenant context" }, { status: 400 }) };
  }

  const ent = await checkInstagramEntitlement(sb, tenantId);
  if (!ent.entitled) {
    return { ok: false, response: NextResponse.json({ error: ent.reason || "Not entitled" }, { status: 403 }) };
  }

  const creds = await getMetaPlatformCredentials();
  if (!creds.metaAppSecret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Meta App Secret not configured" }, { status: 503 }),
    };
  }

  const redirectUri = creds.oauthRedirectUri || `${req.nextUrl.origin}/api/integrations/instagram/callback`;
  const nonce = randomBytes(16).toString("hex");

  const instagramAppId = creds.instagramAppId?.trim();
  if (instagramAppId) {
    const state = `${tenantId}|${nonce}|ig`;
    const scopes = [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
      "instagram_business_content_publish",
      "instagram_business_manage_insights",
    ].join(",");
    const oauthUrl =
      `https://www.instagram.com/oauth/authorize?` +
      new URLSearchParams({
        client_id: instagramAppId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        state,
        force_reauth: "true",
      }).toString();
    return { ok: true, url: oauthUrl };
  }

  if (!creds.metaAppId?.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Configure Instagram App ID or Facebook App ID in SaaS Admin → Meta / Instagram API" },
        { status: 503 },
      ),
    };
  }

  const state = `${tenantId}|${nonce}|fb`;
  const scopes = [
    "instagram_basic",
    "instagram_manage_messages",
    "pages_manage_metadata",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const oauthUrl =
    `https://www.facebook.com/${creds.graphApiVersion}/dialog/oauth?` +
    new URLSearchParams({
      client_id: creds.metaAppId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: "code",
    }).toString();

  return { ok: true, url: oauthUrl };
}

/** GET: redirect to Meta (bookmarkable / full-page navigation with ?token=). */
export async function GET(req: NextRequest) {
  const r = await instagramAuth(req);
  if (!r.ok) return r.response;
  return NextResponse.redirect(r.url);
}

/** POST: return { url } so the client can navigate without fetch opaque-redirect issues. */
export async function POST(req: NextRequest) {
  const r = await instagramAuth(req);
  if (!r.ok) return r.response;
  return NextResponse.json({ url: r.url });
}
