import { NextResponse } from "next/server";
import { loginFailureDescription } from "@/lib/loginFailureMessage";

/**
 * Password login + super_admin check via server-side fetch to Supabase.
 * Avoids browser "Failed to fetch" to *.supabase.co (ad blockers, bad client env bake).
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Server missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const tokenRes = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const tokenJson = (await tokenRes.json()) as Record<string, unknown>;

  if (!tokenRes.ok) {
    const raw =
      (tokenJson.error_description as string) ||
      (tokenJson.msg as string) ||
      (tokenJson.message as string) ||
      (tokenJson.error as string) ||
      "Invalid credentials";
    const msg = loginFailureDescription(String(raw));
    return NextResponse.json({ error: msg }, { status: tokenRes.status >= 400 ? tokenRes.status : 401 });
  }

  const access_token = tokenJson.access_token as string | undefined;
  const refresh_token = tokenJson.refresh_token as string | undefined;
  const user = tokenJson.user as { id?: string } | undefined;

  if (!access_token || !refresh_token || !user?.id) {
    return NextResponse.json({ error: "Unexpected auth response" }, { status: 502 });
  }

  const rpcRes = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/has_role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${access_token}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ _user_id: user.id, _role: "super_admin" }),
  });

  const rpcText = await rpcRes.text();
  let isSuper = false;
  try {
    const parsed = JSON.parse(rpcText) as boolean | unknown;
    isSuper = parsed === true;
  } catch {
    isSuper = rpcText.trim() === "true";
  }

  if (!rpcRes.ok || !isSuper) {
    return NextResponse.json(
      { error: "Access denied: not a super admin (or has_role / schema missing on this project)." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    access_token,
    refresh_token,
  });
}
