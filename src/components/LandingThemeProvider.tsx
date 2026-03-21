"use client";

import { useEffect, useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import {
  isLandingThemePreset,
  LANDING_THEME_PRESET_CLASS,
  mergePresetAndDbTokens,
  normalizeThemeTokens,
  type LandingThemePreset,
} from "@/lib/marketplace-theme";

const ROOT_CLASS_PREFIX = "landing-preset-";

type Props = {
  landingThemeSlug: string | null | undefined;
  themeTokens: Json | undefined;
  children: React.ReactNode;
};

/**
 * Applies declarative landing theme tokens to :root (allowlisted CSS vars only).
 * Preset adds optional class on <html> for global.css hooks.
 */
export function LandingThemeProvider({ landingThemeSlug, themeTokens, children }: Props) {
  const preset: LandingThemePreset = isLandingThemePreset(landingThemeSlug) ? landingThemeSlug : "default";
  const dbTokens = useMemo(() => normalizeThemeTokens(themeTokens), [themeTokens]);
  const merged = useMemo(() => mergePresetAndDbTokens(preset, dbTokens), [preset, dbTokens]);

  useEffect(() => {
    const root = document.documentElement;
    const prevVars: { key: string; prev: string }[] = [];

    Object.entries(merged).forEach(([key, value]) => {
      prevVars.push({ key, prev: root.style.getPropertyValue(key) });
      root.style.setProperty(key, value);
    });

    const cls = LANDING_THEME_PRESET_CLASS[preset];
    const presetClasses = [ROOT_CLASS_PREFIX + preset, cls].filter(Boolean);
    presetClasses.forEach((c) => root.classList.add(c));

    return () => {
      prevVars.forEach(({ key, prev }) => {
        if (prev) root.style.setProperty(key, prev);
        else root.style.removeProperty(key);
      });
      presetClasses.forEach((c) => root.classList.remove(c));
    };
  }, [preset, merged]);

  return <>{children}</>;
}
