import { describe, expect, it } from "vitest";
import { parseMetaWebhookJson, quoteLargeJsonIntegersForParse } from "@/lib/meta-webhook-json";

describe("quoteLargeJsonIntegersForParse", () => {
  it("converts 16+ digit unquoted ids so JSON.parse preserves exact digits", () => {
    const raw = '{"recipient":{"id":17841460827048713},"timestamp":1234567890123}';
    const fixed = quoteLargeJsonIntegersForParse(raw);
    expect(fixed).toContain('"recipient":{"id":"17841460827048713"');
    const parsed = JSON.parse(fixed) as { recipient: { id: string }; timestamp: number };
    expect(parsed.recipient.id).toBe("17841460827048713");
    expect(parsed.timestamp).toBe(1234567890123);
  });
});

describe("parseMetaWebhookJson", () => {
  it("parses Meta-sized ids without precision loss vs JSON.parse", () => {
    const raw = '{"entry":[{"id":17841460827048713,"messaging":[{"sender":{"id":12345678901234567},"recipient":{"id":17841460827048713}}]}]}';
    const parsed = parseMetaWebhookJson(raw) as {
      entry: { id: string; messaging: { sender: { id: string }; recipient: { id: string } }[] }[];
    };
    expect(parsed.entry[0].id).toBe("17841460827048713");
    expect(parsed.entry[0].messaging[0].sender.id).toBe("12345678901234567");
    expect(parsed.entry[0].messaging[0].recipient.id).toBe("17841460827048713");

    const naive = JSON.parse(raw) as typeof parsed;
    expect(naive.entry[0].id).not.toBe("17841460827048713");
  });
});
