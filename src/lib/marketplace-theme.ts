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

export type LandingThemePreset = "default" | "ocean" | "sunset" | "forest" | "plannet";

export const LANDING_THEME_PRESET_CLASS: Record<LandingThemePreset, string> = {
  default: "",
  ocean: "landing-theme-ocean",
  sunset: "landing-theme-sunset",
  forest: "landing-theme-forest",
  plannet: "landing-theme-plannet",
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
  /** Resort-style green, black, and white (palette inspired by luxury nature properties). */
  plannet: {
    "--background": "40 20% 98%",
    "--foreground": "160 22% 9%",
    "--primary": "152 42% 28%",
    "--primary-foreground": "0 0% 99%",
    "--secondary": "160 24% 14%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "150 18% 93%",
    "--muted-foreground": "150 10% 38%",
    "--accent": "142 32% 88%",
    "--accent-foreground": "152 38% 18%",
    "--radius": "0.5rem",
  },
};

export function isLandingThemePreset(s: string | null | undefined): s is LandingThemePreset {
  return s === "default" || s === "ocean" || s === "sunset" || s === "forest" || s === "plannet";
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
