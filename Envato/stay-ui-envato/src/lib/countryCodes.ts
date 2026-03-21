export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  minDigits: number;
}

/** Common travel countries with dial codes, flags, and validation rules */
export const COUNTRY_CODES: CountryCode[] = [
  { code: "91", dialCode: "+91", flag: "🇮🇳", name: "India", minDigits: 10 },
  { code: "1", dialCode: "+1", flag: "🇺🇸", name: "USA", minDigits: 10 },
  { code: "44", dialCode: "+44", flag: "🇬🇧", name: "UK", minDigits: 10 },
  { code: "971", dialCode: "+971", flag: "🇦🇪", name: "UAE", minDigits: 9 },
  { code: "61", dialCode: "+61", flag: "🇦🇺", name: "Australia", minDigits: 9 },
  { code: "65", dialCode: "+65", flag: "🇸🇬", name: "Singapore", minDigits: 8 },
  { code: "60", dialCode: "+60", flag: "🇲🇾", name: "Malaysia", minDigits: 9 },
  { code: "66", dialCode: "+66", flag: "🇹🇭", name: "Thailand", minDigits: 9 },
  { code: "94", dialCode: "+94", flag: "🇱🇰", name: "Sri Lanka", minDigits: 9 },
  { code: "977", dialCode: "+977", flag: "🇳🇵", name: "Nepal", minDigits: 10 },
  { code: "49", dialCode: "+49", flag: "🇩🇪", name: "Germany", minDigits: 10 },
  { code: "33", dialCode: "+33", flag: "🇫🇷", name: "France", minDigits: 9 },
  { code: "81", dialCode: "+81", flag: "🇯🇵", name: "Japan", minDigits: 10 },
  { code: "82", dialCode: "+82", flag: "🇰🇷", name: "South Korea", minDigits: 9 },
  { code: "55", dialCode: "+55", flag: "🇧🇷", name: "Brazil", minDigits: 10 },
  { code: "52", dialCode: "+52", flag: "🇲🇽", name: "Mexico", minDigits: 10 },
  { code: "39", dialCode: "+39", flag: "🇮🇹", name: "Italy", minDigits: 9 },
  { code: "34", dialCode: "+34", flag: "🇪🇸", name: "Spain", minDigits: 9 },
  { code: "31", dialCode: "+31", flag: "🇳🇱", name: "Netherlands", minDigits: 9 },
  { code: "27", dialCode: "+27", flag: "🇿🇦", name: "South Africa", minDigits: 9 },
  { code: "62", dialCode: "+62", flag: "🇮🇩", name: "Indonesia", minDigits: 9 },
  { code: "63", dialCode: "+63", flag: "🇵🇭", name: "Philippines", minDigits: 10 },
  { code: "880", dialCode: "+880", flag: "🇧🇩", name: "Bangladesh", minDigits: 10 },
  { code: "92", dialCode: "+92", flag: "🇵🇰", name: "Pakistan", minDigits: 10 },
];

export const DEFAULT_COUNTRY_CODE = "91";

export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.code === code);
}

export function getMinDigitsForCountry(code: string): number {
  return getCountryByCode(code)?.minDigits ?? 8;
}

/**
 * Normalize phone for WhatsApp wa.me URL.
 * @param phone - Full phone or local digits
 * @param countryCode - Optional dial code (e.g. "91", "971"). When provided, ensures correct prefix: India=91, UAE=971, etc.
 */
export function formatPhoneForWhatsApp(phone: string, countryCode?: string | null): string {
  const cleaned = (phone || "").replace(/\D/g, "").trim();
  if (!cleaned) return "";

  // When country code is provided: use it + local number (avoid double prefix)
  if (countryCode) {
    const code = countryCode.replace(/\D/g, "");
    if (!code) return cleaned;
    if (cleaned.startsWith(code)) return cleaned;
    // Prepend country code (local number may have leading 0)
    const local = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    return code + local;
  }

  // Fallback when no country code: infer from number length
  if (cleaned.length > 10) return cleaned;
  if (cleaned.length === 10 && !cleaned.startsWith("0")) return `91${cleaned}`;
  if (cleaned.startsWith("91")) return cleaned;
  return cleaned;
}

