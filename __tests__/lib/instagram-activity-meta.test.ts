import { describe, expect, it } from "vitest";
import { getInboundPreviewFromMeta } from "@/lib/instagram-activity-meta";

describe("getInboundPreviewFromMeta", () => {
  it("returns string inbound_text", () => {
    expect(getInboundPreviewFromMeta({ inbound_text: "Hello" })).toBe("Hello");
  });

  it("returns null for empty or missing", () => {
    expect(getInboundPreviewFromMeta({ inbound_text: "" })).toBeNull();
    expect(getInboundPreviewFromMeta({})).toBeNull();
    expect(getInboundPreviewFromMeta(null)).toBeNull();
  });

  it("returns null for non-string inbound_text", () => {
    expect(getInboundPreviewFromMeta({ inbound_text: 1 } as never)).toBeNull();
  });
});
