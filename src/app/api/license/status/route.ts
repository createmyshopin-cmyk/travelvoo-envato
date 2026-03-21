import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LICENSE_COOKIE_NAME, verifyLicenseCookieValue } from "@/lib/license-token";

export async function GET() {
  const secret = process.env.LICENSE_SECRET;
  const itemIdRaw = process.env.ENVATO_ITEM_ID;

  if (!secret || !itemIdRaw) {
    return NextResponse.json({
      licensed: false,
      configured: false,
    });
  }

  const expectedItemId = Number(itemIdRaw);
  if (Number.isNaN(expectedItemId)) {
    return NextResponse.json({ licensed: false, configured: false });
  }

  const jar = await cookies();
  const raw = jar.get(LICENSE_COOKIE_NAME)?.value;
  const licensed = await verifyLicenseCookieValue(raw, secret, expectedItemId);

  return NextResponse.json({
    licensed,
    configured: true,
  });
}
