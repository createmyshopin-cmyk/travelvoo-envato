import type { Json } from "@/integrations/supabase/types";

/** Whitelisted CSS custom properties the landing theme may set (security + consistency). */
export const ALLOWED_LANDING_THEME_VARS = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--background",
  "--foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--radius",
] as const;

export type LandingThemePreset = "default" | "ocean" | "sunset" | "forest";

export const LANDING_THEME_PRESET_CLASS: Record<LandingThemePreset, string> = {
  default: "",
  ocean: "landing-theme-ocean",
  sunset: "landing-theme-sunset",
  forest: "landing-theme-forest",
};

/** Optional preset tweaks (merged under allowlist). */
const PRESET_TOKEN_HINTS: Partial<Record<LandingThemePreset, Record<string, string>>> = {
  ocean: {
    "--primary": "199 89% 48%",
    "--secondary": "187 85% 38%",
  },
  sunset: {
    "--primary": "25 95% 53%",
    "--secondary": "358 82% 55%",
  },
  forest: {
    "--primary": "142 71% 35%",
    "--secondary": "160 84% 28%",
  },
};

export function isLandingThemePreset(s: string | null | undefined): s is LandingThemePreset {
  return s === "default" || s === "ocean" || s === "sunset" || s === "forest";
}

export function normalizeThemeTokens(raw: Json | null | undefined): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  const allowed = new Set(ALLOWED_LANDING_THEME_VARS);
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(k as (typeof ALLOWED_LANDING_THEME_VARS)[number])) continue;
    if (typeof v === "string" && v.length < 200) out[k] = v;
  }
  return out;
}

export function mergePresetAndDbTokens(
  preset: LandingThemePreset,
  dbTokens: Record<string, string>
): Record<string, string> {
  const hints = PRESET_TOKEN_HINTS[preset] ?? {};
  return { ...hints, ...dbTokens };
}
