/** In-memory sliding window limiter (single Node instance). For multi-instance, use Redis/Upstash. */

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;

const buckets = new Map<string, number[]>();

export function rateLimitMemory(key: string, max = DEFAULT_MAX): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= max) {
    const oldest = arr[0]!;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true };
}
