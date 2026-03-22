import type { CookieOptionsWithName } from "@supabase/ssr";
import { isLocalOrPreviewHostname } from "@/lib/resolveTenantFromHost";

/**
 * Parent domain for auth cookies so `www`, tenant subdomains, and apex share one session.
 * Set `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.travelvoo.in` or `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN=travelvoo.in`.
 * Omitted on localhost / preview hosts (host-only cookies).
 */
export function getAuthCookieDomainForHostname(hostname: string): string | undefined {
  const h = hostname.toLowerCase();
  if (isLocalOrPreviewHostname(h)) return undefined;
  if (h === "127.0.0.1") return undefined;

  const explicit =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim() : undefined;
  if (explicit) {
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  const base =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN?.trim().toLowerCase()
      : undefined;
  if (base) {
    if (h === base || h.endsWith(`.${base}`)) {
      return `.${base}`;
    }
    return undefined;
  }

  return undefined;
}

export function getAuthCookieOptionsForHostname(hostname: string): CookieOptionsWithName {
  const domain = getAuthCookieDomainForHostname(hostname);
  const secure =
    !isLocalOrPreviewHostname(hostname) && hostname !== "localhost" && hostname !== "127.0.0.1";

  return {
    path: "/",
    sameSite: "lax",
    secure,
    ...(domain ? { domain } : {}),
  };
}
