import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { licenseCookieValidFromRequest } from "@/lib/license-token";
import { getAuthCookieOptionsForHostname } from "@/lib/auth-cookie-options";

function licenseExempt(req: NextRequest): boolean {
  const p = req.nextUrl.pathname;
  return (
    p === "/license" ||
    p.startsWith("/api/license") ||
    // Meta / Instagram hit these without a browser session or license cookie
    p.startsWith("/api/webhooks/")
  );
}

export default async function middleware(req: NextRequest) {
  if (process.env.LICENSE_GATE_ENABLED === "true") {
    const secret = process.env.LICENSE_SECRET;
    const itemIdRaw = process.env.ENVATO_ITEM_ID;
    if (secret && itemIdRaw) {
      const itemId = Number(itemIdRaw);
      if (!Number.isNaN(itemId) && !licenseExempt(req)) {
        const ok = await licenseCookieValidFromRequest(req, secret, itemId);
        if (!ok) {
          const url = req.nextUrl.clone();
          url.pathname = "/license";
          url.searchParams.set("from", req.nextUrl.pathname);
          return NextResponse.redirect(url);
        }
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  let response = NextResponse.next({ request: req });

  if (supabaseUrl && supabaseKey) {
    const hostname = req.nextUrl.hostname;
    const cookieOpts = getAuthCookieOptionsForHostname(hostname);

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookieOptions: cookieOpts,
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
