import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { licenseCookieValidFromRequest } from "@/lib/license-token";

/**
 * Edge middleware: optional Envato license gate only (no third-party auth framework).
 * Re-exported from `middleware.ts`.
 */
export async function middleware(req: NextRequest) {
  if (process.env.LICENSE_GATE_ENABLED === "true") {
    const secret = process.env.LICENSE_SECRET;
    const itemIdRaw = process.env.ENVATO_ITEM_ID;
    if (secret && itemIdRaw) {
      const itemId = Number(itemIdRaw);
      const pathname = req.nextUrl.pathname;
      const exempt = pathname === "/license" || pathname.startsWith("/api/license");
      if (!Number.isNaN(itemId) && !exempt) {
        const ok = await licenseCookieValidFromRequest(req, secret, itemId);
        if (!ok) {
          const url = req.nextUrl.clone();
          url.pathname = "/license";
          url.searchParams.set("from", pathname);
          return NextResponse.redirect(url);
        }
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
