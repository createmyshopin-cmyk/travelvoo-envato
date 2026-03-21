/** Normalize hostname for license storage (no scheme, no path, lowercase). */
export function normalizeActivationDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0] ?? s;
  s = s.split(":")[0] ?? s;
  return s;
}
