import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { rateLimitMemory } from "@/lib/rate-limit-memory";
import {
  REGISTERED_PLUGIN_KEYS,
  safeValidatePluginManifest,
  safeValidateThemeManifest,
} from "@/lib/marketplace-manifest";

/**
 * Server-only AI assist for marketplace manifests.
 * Set OPENAI_API_KEY and optionally MARKETPLACE_AI_MODEL (default gpt-4o-mini).
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.MARKETPLACE_AI_MODEL || "gpt-4o-mini";
  const maxPerMin = Math.max(5, Math.min(120, Number(process.env.MARKETPLACE_AI_MAX_PER_MIN || 30) || 30));

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured", code: "AI_DISABLED" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimitMemory(`ai-suggest:${uid}`, maxPerMin);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: rl.retryAfterSec, code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { data: ok } = await supabase.rpc("has_role", {
    _user_id: uid,
    _role: "super_admin",
  });
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { brief?: string; type?: "theme" | "plugin"; plugin_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brief = (body.brief || "").slice(0, 2000);
  const kind = body.type === "plugin" ? "plugin" : "theme";
  const pluginHint =
    kind === "plugin" && body.plugin_key && REGISTERED_PLUGIN_KEYS.includes(body.plugin_key as (typeof REGISTERED_PLUGIN_KEYS)[number])
      ? ` Prefer plugin_key "${body.plugin_key}" with realistic settings for that plugin.`
      : "";

  const system =
    kind === "theme"
      ? `You output ONLY valid JSON for a landing theme manifest with keys: preset (one of: default, ocean, sunset, forest, plannet), tokens (object with only CSS variable keys from this allowlist: --primary, --primary-foreground, --secondary, --secondary-foreground, --background, --foreground, --muted, --muted-foreground, --accent, --accent-foreground, --radius — values are HSL components like "199 89% 48%" without hsl() wrapper), layout (default or heroImmersive). No markdown.`
      : `You output ONLY valid JSON for a plugin manifest with keys: plugin_key (one of: ${REGISTERED_PLUGIN_KEYS.join(
          ", "
        )}), settings (object matching the plugin — whatsapp_widget: phone string E.164, optional label; extra_footer_links: links array of {title, href}; demo_widget: optional title string), optional doc_url (https URL).${pluginHint} No markdown.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Brief: ${brief}` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: "OpenAI error", detail: err }, { status: 502 });
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return NextResponse.json({ error: "Model returned non-JSON", raw }, { status: 422 });
  }

  if (kind === "theme") {
    const v = safeValidateThemeManifest(parsed);
    if (!v.success) {
      return NextResponse.json(
        { error: "Invalid theme manifest", issues: v.error.flatten(), raw: parsed },
        { status: 422 }
      );
    }
    return NextResponse.json({ manifest: v.data });
  }

  const v = safeValidatePluginManifest(parsed);
  if (!v.success) {
    return NextResponse.json(
      { error: "Invalid plugin manifest", issues: v.error.flatten(), raw: parsed },
      { status: 422 }
    );
  }
  return NextResponse.json({ manifest: v.data });
}
