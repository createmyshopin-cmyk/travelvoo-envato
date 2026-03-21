/**
 * Instagram DM AI pipeline: generate a reply and optionally extract lead fields.
 */

export interface DmAiResult {
  reply: string;
  qualified: boolean;
  extractedFields: {
    full_name?: string;
    phone?: string;
    email?: string;
    message?: string;
  };
}

export async function generateDmReply(
  senderMessage: string,
  systemPrompt: string,
  opts: { model?: string; conversationHistory?: { role: string; content: string }[] } = {},
): Promise<DmAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { reply: "Thanks for your message! Our team will get back to you shortly.", qualified: false, extractedFields: {} };
  }

  const model = opts.model || process.env.INSTAGRAM_DM_MODEL || "gpt-4o-mini";
  const history = opts.conversationHistory || [];

  const messages = [
    {
      role: "system" as const,
      content: `${systemPrompt}\n\nYou are an Instagram DM assistant. Reply naturally and helpfully. If the user provides contact info (name, phone, email) or shows purchase intent, include a JSON block at the end of your reply in this exact format:\n<!--LEAD_JSON:{"qualified":true,"full_name":"...","phone":"...","email":"...","message":"..."}-->\nOtherwise omit the JSON block. Keep replies concise and conversational.`,
    },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: senderMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.7, max_tokens: 500, messages }),
  });

  if (!res.ok) {
    console.error("[instagram-ai] OpenAI error:", res.status, await res.text());
    return { reply: "Thanks for reaching out! We'll get back to you soon.", qualified: false, extractedFields: {} };
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

  const jsonMatch = raw.match(/<!--LEAD_JSON:(.*?)-->/s);
  let qualified = false;
  let extractedFields: DmAiResult["extractedFields"] = {};
  let reply = raw;

  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      qualified = !!parsed.qualified;
      extractedFields = {
        full_name: parsed.full_name || undefined,
        phone: parsed.phone || undefined,
        email: parsed.email || undefined,
        message: parsed.message || undefined,
      };
    } catch { /* malformed JSON from LLM — ignore */ }
    reply = raw.replace(/<!--LEAD_JSON:.*?-->/s, "").trim();
  }

  return { reply, qualified, extractedFields };
}
