import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";
import { encrypt } from "@/lib/encryption";

const TOKEN_KEY_ENV = "INSTAGRAM_TOKEN_ENCRYPTION_KEY";

/** Meta OAuth callback: exchange code for tokens, store connection. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=oauth_denied", req.nextUrl.origin));
  }

  const tenantId = state.split(":")[0];
  if (!tenantId) {
    return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=invalid_state", req.nextUrl.origin));
  }

  const creds = await getMetaPlatformCredentials();
  if (!creds.metaAppId || !creds.metaAppSecret) {
    return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=meta_not_configured", req.nextUrl.origin));
  }

  const redirectUri = creds.oauthRedirectUri || `${req.nextUrl.origin}/api/integrations/instagram/callback`;
  const graphVersion = creds.graphApiVersion || "v21.0";

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token?` +
      new URLSearchParams({
        client_id: creds.metaAppId,
        redirect_uri: redirectUri,
        client_secret: creds.metaAppSecret,
        code,
      }),
    );

    if (!tokenRes.ok) {
      console.error("[instagram-oauth] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=token_exchange_failed", req.nextUrl.origin));
    }

    const tokenData = (await tokenRes.json()) as { access_token: string; token_type: string; expires_in?: number };

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: creds.metaAppId,
        client_secret: creds.metaAppSecret,
        fb_exchange_token: tokenData.access_token,
      }),
    );

    const longData = longRes.ok
      ? ((await longRes.json()) as { access_token: string; expires_in?: number })
      : { access_token: tokenData.access_token, expires_in: tokenData.expires_in };

    const longToken = longData.access_token;
    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000).toISOString()
      : null;

    // Get user's Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/me/accounts?access_token=${longToken}&fields=id,name,access_token,instagram_business_account`,
    );
    const pagesData = (await pagesRes.json()) as { data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string } }[] };

    const page = (pagesData.data ?? []).find((p) => p.instagram_business_account);
    if (!page || !page.instagram_business_account) {
      return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=no_instagram_account", req.nextUrl.origin));
    }

    const pageToken = page.access_token;
    const igBizId = page.instagram_business_account.id;

    // Fetch IG username
    let igUsername = "";
    try {
      const igRes = await fetch(
        `https://graph.facebook.com/${graphVersion}/${igBizId}?fields=username&access_token=${pageToken}`,
      );
      const igData = (await igRes.json()) as { username?: string };
      igUsername = igData.username || "";
    } catch { /* optional */ }

    // Encrypt and store
    const encryptedToken = encrypt(pageToken, TOKEN_KEY_ENV);
    const sb = createServiceRoleClient();

    await sb.from("tenant_instagram_connections" as any).upsert(
      {
        tenant_id: tenantId,
        facebook_page_id: page.id,
        instagram_business_account_id: igBizId,
        page_access_token_encrypted: encryptedToken,
        token_expires_at: expiresAt,
        ig_username: igUsername,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "tenant_id" },
    );

    // Ensure automation config row exists
    await sb.from("instagram_automation_config" as any).upsert(
      { tenant_id: tenantId } as any,
      { onConflict: "tenant_id" },
    );

    return NextResponse.redirect(new URL("/admin/instagram-bot/setup?success=connected", req.nextUrl.origin));
  } catch (err) {
    console.error("[instagram-oauth] Callback error:", err);
    return NextResponse.redirect(new URL("/admin/instagram-bot/setup?error=unexpected", req.nextUrl.origin));
  }
}
