import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { decrypt } from "@/lib/encryption";

export interface MetaPlatformCredentials {
  metaAppId: string;
  metaAppSecret: string;
  webhookVerifyToken: string;
  graphApiVersion: string;
  oauthRedirectUri: string;
}

const META_KEY_ENV = "META_CREDENTIALS_ENCRYPTION_KEY";

/**
 * Resolve Meta platform credentials: DB first, then env fallback.
 * Runs server-side only (service role).
 */
export async function getMetaPlatformCredentials(): Promise<MetaPlatformCredentials> {
  try {
    const sb = createServiceRoleClient();
    const { data } = await sb
      .from("saas_meta_platform_config" as any)
      .select("meta_app_id, app_secret_encrypted, webhook_verify_token, graph_api_version, oauth_redirect_uri")
      .single();

    if (data && (data as any).meta_app_id) {
      const row = data as any;
      let secret = "";
      if (row.app_secret_encrypted) {
        try {
          secret = decrypt(row.app_secret_encrypted, META_KEY_ENV);
        } catch {
          secret = "";
        }
      }
      if (row.meta_app_id && secret) {
        return {
          metaAppId: row.meta_app_id,
          metaAppSecret: secret,
          webhookVerifyToken: row.webhook_verify_token || process.env.META_WEBHOOK_VERIFY_TOKEN || "",
          graphApiVersion: row.graph_api_version || "v21.0",
          oauthRedirectUri: row.oauth_redirect_uri || process.env.INSTAGRAM_OAUTH_REDIRECT_URI || "",
        };
      }
    }
  } catch {
    // DB unavailable — fall through to env
  }

  return {
    metaAppId: process.env.META_APP_ID || "",
    metaAppSecret: process.env.META_APP_SECRET || "",
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "",
    graphApiVersion: "v21.0",
    oauthRedirectUri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI || "",
  };
}
