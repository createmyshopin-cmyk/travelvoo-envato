/**
 * Inbound DM body extraction for Meta Messenger / Instagram messaging webhooks.
 * @see https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages/
 */
export function extractInboundDmBody(message: any): { text: string; mid: string } | null {
  if (!message || message.is_echo) return null;
  const mid = message.mid;
  if (!mid || typeof mid !== "string") return null;

  const raw = message.text;
  if (raw != null && String(raw).trim() !== "") {
    return { text: String(raw), mid };
  }

  const atts = message.attachments;
  if (!Array.isArray(atts) || atts.length === 0) return null;

  const types = atts.map((a: any) => (a?.type ? String(a.type) : "attachment")).join(", ");
  const first = atts[0] as { payload?: { title?: string; url?: string } };
  const extra = first?.payload?.title || first?.payload?.url || "";
  const synthetic = `[${types}]${extra ? ` ${extra}` : ""}`.trim();
  return { text: synthetic || "[attachment]", mid };
}

export function buildRecipientConnectionOrClause(recipientId: string, entryId?: string): string {
  const parts = [
    `instagram_business_account_id.eq.${recipientId}`,
    `facebook_page_id.eq.${recipientId}`,
  ];
  if (entryId && entryId !== recipientId) {
    parts.push(`instagram_business_account_id.eq.${entryId}`, `facebook_page_id.eq.${entryId}`);
  }
  return parts.join(",");
}
