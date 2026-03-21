import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";
import { generateDmReply } from "@/lib/instagram-ai";
import { decrypt } from "@/lib/encryption";

const TOKEN_KEY_ENV = "INSTAGRAM_TOKEN_ENCRYPTION_KEY";

/** GET: Meta webhook subscription verification. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }

  const creds = await getMetaPlatformCredentials();
  if (!creds.webhookVerifyToken || token !== creds.webhookVerifyToken) {
    return NextResponse.json({ error: "Verify token mismatch" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/** POST: Incoming webhook events (DMs, comments, stories). */
export async function POST(req: NextRequest) {
  const start = Date.now();
  const creds = await getMetaPlatformCredentials();

  // 1. Verify X-Hub-Signature-256
  const sig = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();

  if (!sig || !creds.metaAppSecret) {
    return NextResponse.json({ error: "Missing signature or config" }, { status: 400 });
  }

  const expected = "sha256=" + createHmac("sha256", creds.metaAppSecret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(sig, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Must respond 200 quickly to Meta (they retry on non-200)
  // Process async
  processWebhook(payload, creds, start).catch((err) => console.error("[instagram-webhook] Error:", err));

  return NextResponse.json({ status: "ok" });
}

async function processWebhook(payload: any, creds: any, start: number) {
  const sb = createServiceRoleClient();
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    // DM / messaging events
    const messagingEvents = entry.messaging ?? [];
    for (const event of messagingEvents) {
      await handleMessaging(sb, event, creds, start);
    }

    // Comment / changes events (Phase 2 — stub)
    const changes = entry.changes ?? [];
    for (const change of changes) {
      await handleChange(sb, entry, change, creds, start);
    }
  }
}

async function handleMessaging(sb: any, event: any, creds: any, start: number) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const message = event.message;

  if (!senderId || !recipientId || !message?.text) return;
  const mid = message.mid;
  if (!mid) return;

  // Resolve tenant by recipient IG business account id or page id
  const { data: conn } = await sb
    .from("tenant_instagram_connections")
    .select("tenant_id, page_access_token_encrypted, facebook_page_id, instagram_business_account_id")
    .or(`instagram_business_account_id.eq.${recipientId},facebook_page_id.eq.${recipientId}`)
    .maybeSingle();

  if (!conn) return;

  // Entitlement check
  const ent = await checkInstagramEntitlement(sb, conn.tenant_id);
  if (!ent.entitled) return;

  // Dedupe
  const { error: dedupeErr } = await sb
    .from("instagram_webhook_events")
    .insert({ message_mid: mid, tenant_id: conn.tenant_id })
    .select()
    .maybeSingle();
  if (dedupeErr) return; // duplicate

  // Load tenant AI settings
  const { data: aiSettings } = await sb
    .from("ai_settings")
    .select("system_prompt, ai_model")
    .eq("tenant_id", conn.tenant_id)
    .maybeSingle();

  // Load automation config
  const { data: autoConfig } = await sb
    .from("instagram_automation_config")
    .select("enabled, settings")
    .eq("tenant_id", conn.tenant_id)
    .maybeSingle();

  if (autoConfig && !autoConfig.enabled) return;

  const settings = (autoConfig?.settings ?? {}) as any;
  const dmConfig = settings.channels?.dm ?? {};
  if (dmConfig.enabled === false) return;

  // Schedule check (Phase 2 — stub, always passes)
  // Keyword check (Phase 2 — stub, falls through to AI)

  const systemPrompt = aiSettings?.system_prompt || "You are a helpful travel assistant.";
  const model = aiSettings?.ai_model || process.env.INSTAGRAM_DM_MODEL || "gpt-4o-mini";

  // Generate AI reply
  const aiResult = await generateDmReply(message.text, systemPrompt, { model });

  // Send reply via Graph API
  let pageToken = "";
  try {
    pageToken = decrypt(conn.page_access_token_encrypted, TOKEN_KEY_ENV);
  } catch {
    console.error("[instagram-webhook] Failed to decrypt page token for tenant", conn.tenant_id);
    return;
  }

  const graphVersion = creds.graphApiVersion || "v21.0";
  const sendUrl = `https://graph.facebook.com/${graphVersion}/${conn.facebook_page_id}/messages`;

  const sendRes = await fetch(sendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text: aiResult.reply },
      messaging_type: "RESPONSE",
      access_token: pageToken,
    }),
  });

  if (!sendRes.ok) {
    console.error("[instagram-webhook] Send failed:", sendRes.status, await sendRes.text());
  }

  const latency = Date.now() - start;

  // Insert lead if qualified
  let leadId: string | null = null;
  if (aiResult.qualified) {
    const { data: lead } = await sb
      .from("leads")
      .insert({
        tenant_id: conn.tenant_id,
        source: "instagram_dm",
        full_name: aiResult.extractedFields.full_name || null,
        phone: aiResult.extractedFields.phone || null,
        email: aiResult.extractedFields.email || null,
        message: aiResult.extractedFields.message || message.text,
        meta: { sender_ig_id: senderId, mid },
      })
      .select("id")
      .maybeSingle();
    leadId = lead?.id ?? null;
  }

  // Log activity
  await sb.from("instagram_channel_activity").insert({
    tenant_id: conn.tenant_id,
    channel: "dm",
    event_type: aiResult.qualified ? "lead_captured" : "message_replied",
    sender_ig_id: senderId,
    lead_id: leadId,
    latency_ms: latency,
    meta: { mid, qualified: aiResult.qualified },
  });
}

async function handleChange(sb: any, entry: any, change: any, _creds: any, start: number) {
  if (change.field !== "comments" && change.field !== "feed") return;

  const value = change.value;
  if (!value) return;

  const mediaId = value.media_id || value.media?.id;
  const commentId = value.id || value.comment_id;
  const text = value.text || "";
  const senderId = value.from?.id;

  if (!mediaId || !commentId || !text) return;

  // Resolve tenant by matching media to a connection (via media API or page id)
  // For Phase 2, look up by the page that owns the media
  const pageId = entry.id;
  const { data: conn } = await sb
    .from("tenant_instagram_connections")
    .select("tenant_id, page_access_token_encrypted, facebook_page_id, instagram_business_account_id")
    .eq("facebook_page_id", pageId)
    .maybeSingle();

  if (!conn) return;

  const ent = await checkInstagramEntitlement(sb, conn.tenant_id);
  if (!ent.entitled) return;

  // Dedupe by comment id
  const dedupeKey = `comment:${commentId}`;
  const { error: dedupeErr } = await sb
    .from("instagram_webhook_events")
    .insert({ message_mid: dedupeKey, tenant_id: conn.tenant_id })
    .select()
    .maybeSingle();
  if (dedupeErr) return;

  // Check automation config
  const { data: autoConfig } = await sb
    .from("instagram_automation_config")
    .select("enabled, settings")
    .eq("tenant_id", conn.tenant_id)
    .maybeSingle();

  if (autoConfig && !autoConfig.enabled) return;
  const settings = (autoConfig?.settings ?? {}) as any;
  const commentConfig = settings.channels?.comment ?? {};
  if (commentConfig.enabled === false) return;

  // Phase 2: check media allowlist
  const { data: mediaTarget } = await sb
    .from("instagram_automation_media_targets")
    .select("id")
    .eq("tenant_id", conn.tenant_id)
    .eq("ig_media_id", mediaId)
    .eq("enabled", true)
    .maybeSingle();

  // If media_targets table has entries for this tenant but this media isn't in it, skip
  const { count: totalTargets } = await sb
    .from("instagram_automation_media_targets")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", conn.tenant_id);

  if ((totalTargets ?? 0) > 0 && !mediaTarget) return;

  // Keyword evaluation (Phase 2)
  const keywordRules = settings.keyword_rules ?? [];
  let action = "ai_reply";
  let templateText = "";

  const normalizedText = text.toLowerCase().trim();
  for (const rule of keywordRules) {
    if (rule.channel && rule.channel !== "comment") continue;
    if (!rule.enabled) continue;
    const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
    const hit = matches.some((m: string) => {
      const needle = (rule.case_sensitive ? m : m.toLowerCase()).trim();
      if (rule.match_type === "exact") return normalizedText === needle;
      if (rule.match_type === "whole_word") return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
      return normalizedText.includes(needle);
    });
    if (hit) {
      action = rule.action || "ai_reply";
      templateText = rule.template_text || "";
      break;
    }
  }

  if (action === "suppress") return;

  const latency = Date.now() - start;

  await sb.from("instagram_channel_activity").insert({
    tenant_id: conn.tenant_id,
    channel: "comment",
    event_type: "comment_received",
    sender_ig_id: senderId || null,
    latency_ms: latency,
    meta: { comment_id: commentId, media_id: mediaId, action, text: text.slice(0, 500) },
  });
}
