import { createHmac, timingSafeEqual } from "crypto";
import { describe, it, expect } from "vitest";

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

describe("webhook signature verification", () => {
  const secret = "test_app_secret_123";
  const body = '{"object":"instagram","entry":[]}';

  it("accepts a valid signature", () => {
    const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyWebhookSignature(body, "sha256=deadbeef00000000", secret)).toBe(false);
  });

  it("rejects when signature is missing sha256= prefix", () => {
    const raw = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, raw, secret)).toBe(false);
  });

  it("rejects when body is tampered", () => {
    const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    const tampered = body + " ";
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
  });
});
