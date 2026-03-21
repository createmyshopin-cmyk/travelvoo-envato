import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { encrypt, decrypt } from "@/lib/encryption";

const META_KEY_ENV = "META_CREDENTIALS_ENCRYPTION_KEY";

async function authenticateSuperAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const sb = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data } = await sb.auth.getUser();
  if (!data.user?.id) return null;
  const { data: ok } = await sb.rpc("has_role", { _user_id: data.user.id, _role: "super_admin" });
  return ok ? data.user.id : null;
}

/** GET: return current Meta credentials (secret masked). */
export async function GET(req: Request) {
  const uid = await authenticateSuperAdmin(req);
  if (!uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = createServiceRoleClient();
  const { data } = await sb
    .from("saas_meta_platform_config" as any)
    .select("meta_app_id, app_secret_encrypted, webhook_verify_token, graph_api_version, oauth_redirect_uri")
    .single();

  if (!data) return NextResponse.json({ meta_app_id: "", webhook_verify_token: "", graph_api_version: "v21.0", oauth_redirect_uri: "", has_secret: false });

  const row = data as any;
  let hasSecret = false;
  if (row.app_secret_encrypted) {
    try {
      decrypt(row.app_secret_encrypted, META_KEY_ENV);
      hasSecret = true;
    } catch { /* corrupt or missing key */ }
  }

  return NextResponse.json({
    meta_app_id: row.meta_app_id || "",
    webhook_verify_token: row.webhook_verify_token || "",
    graph_api_version: row.graph_api_version || "v21.0",
    oauth_redirect_uri: row.oauth_redirect_uri || "",
    has_secret: hasSecret,
  });
}

/** POST: save Meta credentials. Only app_secret is encrypted. */
export async function POST(req: Request) {
  const uid = await authenticateSuperAdmin(req);
  if (!uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { meta_app_id?: string; app_secret?: string; webhook_verify_token?: string; graph_api_version?: string; oauth_redirect_uri?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = createServiceRoleClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.meta_app_id !== undefined) update.meta_app_id = body.meta_app_id;
  if (body.webhook_verify_token !== undefined) update.webhook_verify_token = body.webhook_verify_token;
  if (body.graph_api_version !== undefined) update.graph_api_version = body.graph_api_version;
  if (body.oauth_redirect_uri !== undefined) update.oauth_redirect_uri = body.oauth_redirect_uri;

  if (body.app_secret) {
    if (!process.env[META_KEY_ENV]) {
      return NextResponse.json({ error: "META_CREDENTIALS_ENCRYPTION_KEY not set on server" }, { status: 503 });
    }
    update.app_secret_encrypted = encrypt(body.app_secret, META_KEY_ENV);
  }

  const { error } = await sb
    .from("saas_meta_platform_config" as any)
    .update(update as any)
    .eq("id", "00000000-0000-0000-0000-000000000001");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
