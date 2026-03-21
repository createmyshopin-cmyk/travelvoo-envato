/**
 * Instagram Business Login (OAuth on instagram.com) stores a long-lived **Instagram user** token
 * that must be used with `https://graph.instagram.com`.
 * Facebook Login + Page token uses `https://graph.facebook.com`.
 *
 * Callback stores the same id in both `facebook_page_id` and `instagram_business_account_id`
 * only for the Instagram-only flow.
 */
export function resolveInstagramGraphHost(conn: {
  facebook_page_id: string;
  instagram_business_account_id: string;
}): "https://graph.facebook.com" | "https://graph.instagram.com" {
  return String(conn.facebook_page_id) === String(conn.instagram_business_account_id)
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com";
}

export function isLikelyWrongGraphHostTokenError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("invalid oauth") ||
    m.includes("cannot parse access token") ||
    m.includes("parse access token") ||
    m.includes("invalid access token")
  );
}
