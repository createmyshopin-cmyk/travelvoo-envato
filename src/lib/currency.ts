/**
 * Platform currency (SaaS admin → localStorage `saas_platform_settings.defaultCurrency` + DB `default_currency`).
 */

export type PlatformCurrencyCode = "USD" | "INR" | "EUR" | "GBP";

const DEFAULT_CODE: PlatformCurrencyCode = "INR";

export function getStoredCurrencyCode(): PlatformCurrencyCode {
  if (typeof window === "undefined") return DEFAULT_CODE;
  try {
    const raw = localStorage.getItem("saas_platform_settings");
    if (raw) {
      const j = JSON.parse(raw) as { defaultCurrency?: string };
      if (j?.defaultCurrency && isSupportedCurrency(j.defaultCurrency)) {
        return j.defaultCurrency as PlatformCurrencyCode;
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CODE;
}

export function isSupportedCurrency(code: string): boolean {
  return ["USD", "INR", "EUR", "GBP"].includes(code);
}

function localeForCurrency(code: string): string {
  if (code === "INR") return "en-IN";
  if (code === "EUR") return "de-DE";
  if (code === "GBP") return "en-GB";
  return "en-US";
}

/** Full Intl currency string, e.g. "$1,234" or "₹1,234" */
export function formatMoneyAmount(amount: number, currencyCode?: string): string {
  const code = currencyCode ?? getStoredCurrencyCode();
  return new Intl.NumberFormat(localeForCurrency(code), {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Short symbol for labels like "Price ($)" */
export function currencySymbol(code: string): string {
  const map: Record<string, string> = { USD: "$", INR: "₹", EUR: "€", GBP: "£" };
  return map[code] ?? code;
}

/** Compact display for large amounts (e.g. charts, calendar cells). */
export function formatMoneyCompact(amount: number, currencyCode?: string): string {
  const code = currencyCode ?? getStoredCurrencyCode();
  const sym = currencySymbol(code);
  if (amount >= 10000) {
    const k = amount / 1000;
    const s = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${sym}${s}k`;
  }
  return formatMoneyAmount(amount, code);
}
