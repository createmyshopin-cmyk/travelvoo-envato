/**
 * Signed license cookie (HMAC-SHA256) — Edge-safe.
 */

import type { NextRequest } from "next/server";

export type LicensePayload = {
  itemId: number;
  exp: number;
};

function encoder() {
  return new TextEncoder();
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

const COOKIE = "envato_license";

export async function createLicenseCookieValue(
  itemId: number,
  secret: string,
  maxAgeSeconds: number
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload: LicensePayload = { itemId, exp };
  const json = JSON.stringify(payload);
  const payloadB64 = bytesToBase64Url(encoder().encode(json));
  const sig = await hmacSha256Hex(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyLicenseCookieValue(
  value: string | undefined,
  secret: string,
  expectedItemId: number
): Promise<boolean> {
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigHex] = parts;
  const expectedSig = await hmacSha256Hex(secret, payloadB64);
  if (!timingSafeEqualHex(expectedSig, sigHex)) return false;

  let parsed: LicensePayload;
  try {
    parsed = JSON.parse(base64UrlToString(payloadB64)) as LicensePayload;
  } catch {
    return false;
  }

  if (parsed.itemId !== expectedItemId) return false;
  if (typeof parsed.exp !== "number") return false;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function licenseCookieValidFromRequest(
  req: NextRequest,
  secret: string,
  expectedItemId: number
): Promise<boolean> {
  const raw = req.cookies.get(COOKIE)?.value;
  return verifyLicenseCookieValue(raw, secret, expectedItemId);
}

export const LICENSE_COOKIE_NAME = COOKIE;
