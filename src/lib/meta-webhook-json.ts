/**
 * Meta webhook payloads may include Graph IDs as JSON numbers. Values beyond
 * `Number.MAX_SAFE_INTEGER` (≈9e15) are rounded by `JSON.parse`, breaking
 * tenant lookup (`recipient.id`, `sender.id`, `entry.id`).
 *
 * Quote unquoted integers with 16+ digits so they parse as exact strings.
 */
export function quoteLargeJsonIntegersForParse(raw: string): string {
  return raw.replace(/:\s*(\d{16,})\s*([,}\]])/g, (_m, digits: string, suffix: string) => `:"${digits}"${suffix}`);
}

export function parseMetaWebhookJson(rawBody: string): unknown {
  return JSON.parse(quoteLargeJsonIntegersForParse(rawBody));
}
