import { createHmac } from "crypto";

/** Deterministic hash for storing purchase codes (never store plaintext). */
export function hashPurchaseCode(purchaseCode: string, licenseSecret: string): string {
  const normalized = purchaseCode.trim().toLowerCase();
  return createHmac("sha256", licenseSecret).update(normalized).digest("hex");
}
