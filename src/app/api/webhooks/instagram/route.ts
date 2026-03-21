import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";
import { getMetaPlatformCredentials } from "@/lib/meta-credentials";
import { checkInstagramEntitlement } from "@/lib/instagram-entitlement";
import { generateDmReply } from "@/lib/instagram-ai";
import { decrypt } from "@/lib/encryption";
import { evaluateFlowDefinition, type FlowDefinition, type FlowVisit } from "@/lib/flow-engine";
import { checkSenderFollowsBusinessAccount } from "@/lib/instagram-follower";
import { followerFollowsToPlanValue } from "@/lib/instagram-follower-check";
import { sendInstagramMessagesWithHostFallback } from "@/lib/instagram-graph-host";
import { buildRecipientConnectionOrClause, extractInboundDmBody } from "@/lib/instagram-webhook-inbound";
import { parseMetaWebhookJson } from "@/lib/meta-webhook-json";

const TOKEN_KEY_ENV = "INSTAGRAM_TOKEN_ENCRYPTION_KEY";

/** GET: Meta webhook subscription verification. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = (params.get("hub.verify_token") ?? "").trim();
  const challenge = params.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }

  const creds = await getMetaPlatformCredentials();
  const expected = (creds.webhookVerifyToken ?? "").trim();
  if (!expected || token !== expected) {
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
    payload = parseMetaWebhookJson(rawBody) as any;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Must respond 200 quickly to Meta (they retry on non-200)
  // Process async
  processWebhook(payload, creds, start).catch((err) => console.error("[instagram-webhook] Error:", err));

  return NextResponse.json({ status: "ok" });
}

async function logFlowExecutionRows(
  sb: any,
  tenantId: string,
  flowId: string,
  visited: FlowVisit[],
  senderIgId: string,
) {
  if (!visited?.length) return;
  const rows = visited.map((v) => ({
    tenant_id: tenantId,
    flow_id: flowId,
    node_id: v.nodeId,
    passed: v.passed,
    meta: v.meta ?? {},
    event_type: "node_visit",
    sender_ig_id: senderIgId || null,
    result:
      v.passed === true ? "pass" : v.passed === false ? "fail" : v.passed === null ? "action" : "unknown",
  }));
  await sb.from("instagram_flow_executions").insert(rows);
}

async function resolveSendLinkFollowerGate(
  sb: any,
  tenantId: string,
  senderIgId: string,
  conn: { instagram_business_account_id: string; page_access_token_encrypted: string },
  graphVersion: string,
  existing?: { follows: boolean | null; source?: string },
): Promise<{ allowed: boolean; follows: boolean | null; source?: string }> {
  if (existing?.follows === true) {
    return { allowed: true, follows: true, source: existing.source };
  }
  const r = await checkSenderFollowsBusinessAccount(
    sb,
    tenantId,
    senderIgId,
    {
      instagram_business_account_id: conn.instagram_business_account_id,
      page_access_token_encrypted: conn.page_access_token_encrypted,
    },
    graphVersion,
  );
  return { allowed: r.follows === true, follows: r.follows, source: r.source };
}

function channelMatchesFlow(rowChannel: string, channel: "dm" | "comment" | "story"): boolean {
  const c = (rowChannel || "dm").toLowerCase();
  if (c === "all") return true;
  return c === channel;
}

async function tryFlows(
  sb: any,
  tenantId: string,
  channel: "dm" | "comment" | "story",
  messageText: string,
  senderIgId: string,
  conn: {
    instagram_business_account_id: string;
    page_access_token_encrypted: string;
  },
  graphVersion: string,
  isFirstMessage: boolean,
): Promise<{
  action: import("@/lib/flow-engine").ResolvedFlowAction | null;
  flowId: string | null;
  visited: FlowVisit[];
  followerCheck?: import("@/lib/flow-engine").FlowEvalResult["followerCheck"];
}> {
  const { data: flowRows } = await sb
    .from("instagram_automation_flows")
    .select("id,flow_definition,channel,version")
    .eq("tenant_id", tenantId)
    .eq("enabled", true)
    .eq("is_draft", false)
    .order("version", { ascending: false });

  const ctx = { channel, messageText, senderIgId, tenantId, now: new Date(), isFirstMessage };

  for (const row of flowRows ?? []) {
    if (!channelMatchesFlow(String(row.channel), channel)) continue;
    const def = row.flow_definition as FlowDefinition;
    const result = await evaluateFlowDefinition(def, ctx, {
      checkFollower: async () => {
        const r = await checkSenderFollowsBusinessAccount(
          sb,
          tenantId,
          senderIgId,
          {
            instagram_business_account_id: conn.instagram_business_account_id,
            page_access_token_encrypted: conn.page_access_token_encrypted,
          },
          graphVersion,
        );
        return { follows: r.follows, source: r.source };
      },
    });
    if (result.action) {
      await logFlowExecutionRows(sb, tenantId, row.id, result.visited, senderIgId);
      return {
        action: result.action,
        flowId: row.id,
        visited: result.visited,
        followerCheck: result.followerCheck,
      };
    }
  }
  return { action: null, flowId: null, visited: [] };
}

function matchDbKeywordRule(rule: any, text: string, channel: string): boolean {
  if (!rule.enabled) return false;
  if (rule.channel && rule.channel !== channel) return false;
  const matches = Array.isArray(rule.match) ? rule.match : [rule.match];
  const normalizedText = text.toLowerCase().trim();
  return matches.some((m: string) => {
    const needle = (rule.case_sensitive ? m : m.toLowerCase()).trim();
    const haystack = rule.case_sensitive ? text.trim() : normalizedText;
    if (rule.match_type === "exact") return haystack === needle;
    if (rule.match_type === "whole_word") {
      return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, rule.case_sensitive ? "" : "i").test(
        text,
      );
    }
    return haystack.includes(needle);
  });
}

async function loadKeywordRulesAction(
  sb: any,
  tenantId: string,
  channel: "dm" | "comment",
  text: string,
): Promise<{ action: string; template_text: string; url: string } | null> {
  const { data: dbRules } = await sb
    .from("instagram_automation_keyword_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("enabled", true)
    .order("priority", { ascending: true });

  for (const rule of dbRules ?? []) {
    if (matchDbKeywordRule(rule, text, channel)) {
      return {
        action: rule.action || "ai_reply",
        template_text: rule.template_text || "",
        url: rule.url || "",
      };
    }
  }
  return null;
}

async function processWebhook(payload: any, creds: any, start: number) {
  const obj = payload?.object;
  if (obj && obj !== "page" && obj !== "instagram") {
    console.warn("[instagram-webhook] Unexpected payload.object (still processing entry.messaging)", obj);
  }

  const sb = createServiceRoleClient();
  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    // DM: primary thread + standby (handover — non-primary app receives standby only)
    const messagingEvents = [...(entry.messaging ?? []), ...(entry.standby ?? [])];
    for (const event of messagingEvents) {
      await handleMessaging(sb, event, creds, start, { entryId: entry.id });
    }

    // Comment / changes events (Phase 2 — stub)
    const changes = entry.changes ?? [];
    for (const change of changes) {
      await handleChange(sb, entry, change, creds, start);
    }
  }
}

async function handleMessaging(
  sb: any,
  event: any,
  creds: any,
  start: number,
  ctx?: { entryId?: string },
) {
  const senderId = event.sender?.id != null ? String(event.sender.id) : "";
  const recipientId = event.recipient?.id != null ? String(event.recipient.id) : "";
  const message = event.message;

  if (!senderId || !recipientId) {
    console.warn("[instagram-webhook] DM skipped: missing sender or recipient");
    return;
  }

  if (!message) {
    return;
  }

  const inbound = extractInboundDmBody(message);
  if (!inbound) {
    if (!message.is_echo) {
      console.warn("[instagram-webhook] DM skipped: no text/attachments or mid (unsupported message shape)");
    }
    return;
  }
  const { text: inboundText, mid } = inbound;

  // Resolve tenant by recipient IG business account id or page id (optional entry.id fallback)
  const { data: conn } = await sb
    .from("tenant_instagram_connections")
    .select("tenant_id, page_access_token_encrypted, facebook_page_id, instagram_business_account_id")
    .or(buildRecipientConnectionOrClause(recipientId, ctx?.entryId))
    .maybeSingle();

  if (!conn) {
    console.warn(
      "[instagram-webhook] DM skipped: no tenant_instagram_connections for recipient id (must match ig biz id or page id in DB)",
      recipientId,
    );
    return;
  }

  // Entitlement check
  const ent = await checkInstagramEntitlement(sb, conn.tenant_id);
  if (!ent.entitled) {
    console.warn("[instagram-webhook] DM skipped: not entitled", conn.tenant_id, ent.reason ?? "");
    return;
  }

  // Dedupe
  const { error: dedupeErr } = await sb
    .from("instagram_webhook_events")
    .insert({ message_mid: mid, tenant_id: conn.tenant_id })
    .select()
    .maybeSingle();
  if (dedupeErr) {
    console.warn("[instagram-webhook] DM skipped: duplicate message_mid (Meta retry or same event)", mid);
    return; // duplicate
  }

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

  if (autoConfig && !autoConfig.enabled) {
    console.warn("[instagram-webhook] DM skipped: instagram_automation_config master disabled (tenant)", conn.tenant_id);
    return;
  }

  const settings = (autoConfig?.settings ?? {}) as any;
  const dmConfig = settings.channels?.dm ?? {};
  if (dmConfig.enabled === false) {
    console.warn("[instagram-webhook] DM skipped: DM channel disabled in settings (tenant)", conn.tenant_id);
    return;
  }

  const graphVersion = creds.graphApiVersion || "v25.0";

  const { count: priorDmCount } = await sb
    .from("instagram_channel_activity")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", conn.tenant_id)
    .eq("sender_ig_id", senderId)
    .eq("channel", "dm");
  const isFirstDmMessage = (priorDmCount ?? 0) === 0;

  const flowHit = await tryFlows(
    sb,
    conn.tenant_id,
    "dm",
    inboundText,
    senderId,
    conn,
    graphVersion,
    isFirstDmMessage,
  );

  const followerCheckPlan = flowHit.followerCheck
    ? followerFollowsToPlanValue(flowHit.followerCheck.follows)
    : null;
  const followerDetail = flowHit.followerCheck
    ? { follows: flowHit.followerCheck.follows, source: flowHit.followerCheck.source }
    : null;

  let action = flowHit.action?.type ?? "ai_reply";
  let templateText = flowHit.action?.templateText ?? "";
  let url = flowHit.action?.url ?? "";

  if (!flowHit.action) {
    const kr = await loadKeywordRulesAction(sb, conn.tenant_id, "dm", inboundText);
    if (kr) {
      action = kr.action;
      templateText = kr.template_text;
      url = kr.url;
    }
  }

  let pageToken = "";
  try {
    pageToken = decrypt(conn.page_access_token_encrypted, TOKEN_KEY_ENV);
  } catch {
    console.error("[instagram-webhook] Failed to decrypt page token for tenant", conn.tenant_id);
    return;
  }

  const inboundPreview = inboundText.slice(0, 500);
  const activityBase = {
    tenant_id: conn.tenant_id,
    channel: "dm",
    sender_ig_id: senderId,
    follower_check: followerCheckPlan,
    meta: {
      mid,
      flow_id: flowHit.flowId,
      resolution: flowHit.flowId ? "flow" : "keyword_or_ai",
      follower_check_detail: followerDetail,
      inbound_text: inboundPreview,
    },
  };

  if (action === "suppress") {
    await sb.from("instagram_channel_activity").insert({
      ...activityBase,
      event_type: "suppressed",
      latency_ms: Date.now() - start,
      lead_id: null,
    });
    return;
  }

  if (action === "template_reply" || action === "send_link") {
    let bodyText =
      action === "send_link" && url
        ? `${templateText ? `${templateText}\n` : ""}${url}`.trim()
        : (templateText || "Thanks for your message!");
    let metaExtra: Record<string, unknown> = { action };
    let followerColForRow = followerCheckPlan;

    if (action === "send_link") {
      const gate = await resolveSendLinkFollowerGate(
        sb,
        conn.tenant_id,
        senderId,
        conn,
        graphVersion,
        flowHit.followerCheck,
      );
      followerColForRow = followerFollowsToPlanValue(gate.follows);
      metaExtra.follower_check_detail = { follows: gate.follows, source: gate.source };

      if (!gate.allowed) {
        bodyText =
          templateText?.trim() ||
          "Follow our Instagram account, then message again and we’ll send you the link.";
        metaExtra.flow_funnel = "blocked_not_following";
        metaExtra.send_link_blocked = true;
      } else {
        metaExtra.flow_funnel = "link_sent_follower";
      }
    }

    const sendRes = await sendInstagramMessagesWithHostFallback(conn, graphVersion, {
      recipient: { id: senderId },
      message: { text: bodyText },
      messaging_type: "RESPONSE",
      access_token: pageToken,
    });
    if (!sendRes.ok) {
      console.error("[instagram-webhook] Send failed:", sendRes.status, await sendRes.text());
    }
    const latency = Date.now() - start;
    await sb.from("instagram_channel_activity").insert({
      ...activityBase,
      follower_check: action === "send_link" ? followerColForRow : activityBase.follower_check,
      event_type: "message_replied",
      latency_ms: latency,
      lead_id: null,
      meta: { ...activityBase.meta, ...metaExtra },
    });
    return;
  }

  const systemPrompt = aiSettings?.system_prompt || "You are a helpful travel assistant.";
  const model = aiSettings?.ai_model || process.env.INSTAGRAM_DM_MODEL || "gpt-4o-mini";

  const aiResult = await generateDmReply(inboundText, systemPrompt, { model });

  const sendRes = await sendInstagramMessagesWithHostFallback(conn, graphVersion, {
    recipient: { id: senderId },
    message: { text: aiResult.reply },
    messaging_type: "RESPONSE",
    access_token: pageToken,
  });

  if (!sendRes.ok) {
    console.error("[instagram-webhook] Send failed:", sendRes.status, await sendRes.text());
  }

  const latency = Date.now() - start;

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
        message: aiResult.extractedFields.message || inboundText,
        meta: { sender_ig_id: senderId, mid },
      })
      .select("id")
      .maybeSingle();
    leadId = lead?.id ?? null;
  }

  await sb.from("instagram_channel_activity").insert({
    ...activityBase,
    event_type: aiResult.qualified ? "lead_captured" : "message_replied",
    lead_id: leadId,
    latency_ms: latency,
    meta: { ...activityBase.meta, qualified: aiResult.qualified },
  });
}

async function handleChange(sb: any, entry: any, change: any, creds: any, start: number) {
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

  const graphVersion = creds?.graphApiVersion || "v25.0";
  const sid = senderId || "";
  const { count: priorCommentCount } = await sb
    .from("instagram_channel_activity")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", conn.tenant_id)
    .eq("sender_ig_id", sid)
    .eq("channel", "comment");
  const isFirstComment = (priorCommentCount ?? 0) === 0;

  const flowHit = await tryFlows(
    sb,
    conn.tenant_id,
    "comment",
    text,
    sid,
    conn,
    graphVersion,
    isFirstComment,
  );
  const followerCheckPlan = flowHit.followerCheck
    ? followerFollowsToPlanValue(flowHit.followerCheck.follows)
    : null;
  const followerDetail = flowHit.followerCheck
    ? { follows: flowHit.followerCheck.follows, source: flowHit.followerCheck.source }
    : null;

  let action = flowHit.action?.type ?? "ai_reply";
  let templateText = flowHit.action?.templateText ?? "";

  if (!flowHit.action) {
    const kr = await loadKeywordRulesAction(sb, conn.tenant_id, "comment", text);
    if (kr) {
      action = kr.action;
      templateText = kr.template_text;
    }
  }

  if (action === "suppress") return;

  const latency = Date.now() - start;

  await sb.from("instagram_channel_activity").insert({
    tenant_id: conn.tenant_id,
    channel: "comment",
    event_type: "comment_received",
    sender_ig_id: sid || null,
    latency_ms: latency,
    follower_check: followerCheckPlan,
    meta: {
      comment_id: commentId,
      media_id: mediaId,
      action,
      text: text.slice(0, 500),
      flow_id: flowHit.flowId,
      template_preview: templateText?.slice(0, 200),
      follower_check_detail: followerDetail,
    },
  });
}
