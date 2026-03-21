import { describe, expect, it } from "vitest";
import { buildRecipientConnectionOrClause, extractInboundDmBody } from "@/lib/instagram-webhook-inbound";

describe("extractInboundDmBody", () => {
  it("returns text when message.text is set", () => {
    expect(
      extractInboundDmBody({
        mid: "m1",
        text: "hello",
      }),
    ).toEqual({ text: "hello", mid: "m1" });
  });

  it("returns synthetic text for attachment-only messages", () => {
    expect(
      extractInboundDmBody({
        mid: "m2",
        attachments: [{ type: "image", payload: { url: "https://example.com/x.jpg" } }],
      }),
    ).toEqual({ text: "[image] https://example.com/x.jpg", mid: "m2" });
  });

  it("returns null for echoes", () => {
    expect(
      extractInboundDmBody({
        mid: "m3",
        is_echo: true,
        text: "outbound",
      }),
    ).toBeNull();
  });
});

describe("buildRecipientConnectionOrClause", () => {
  it("adds entry id when different from recipient", () => {
    expect(buildRecipientConnectionOrClause("A", "B")).toBe(
      "instagram_business_account_id.eq.A,facebook_page_id.eq.A,instagram_business_account_id.eq.B,facebook_page_id.eq.B",
    );
  });

  it("omits duplicate entry id", () => {
    expect(buildRecipientConnectionOrClause("A", "A")).toBe(
      "instagram_business_account_id.eq.A,facebook_page_id.eq.A",
    );
  });
});
