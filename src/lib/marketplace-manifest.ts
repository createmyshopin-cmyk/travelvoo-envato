import { z } from "zod";
import {
  ALLOWED_LANDING_THEME_VARS,
  type LandingThemePreset,
} from "@/lib/marketplace-theme";

/** Keys implemented in app code — add a module + schema before extending. */
export const REGISTERED_PLUGIN_KEYS = [
  "whatsapp_widget",
  "extra_footer_links",
  "demo_widget",
] as const;

export type RegisteredPluginKey = (typeof REGISTERED_PLUGIN_KEYS)[number];

const landingLayoutSchema = z.enum(["default", "heroImmersive"]);

const themeTokensSchema = z
  .record(z.string().max(200))
  .optional()
  .superRefine((tokens, ctx) => {
    if (!tokens) return;
    const allowed = new Set(ALLOWED_LANDING_THEME_VARS);
    for (const k of Object.keys(tokens)) {
      if (!allowed.has(k as (typeof ALLOWED_LANDING_THEME_VARS)[number])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Disallowed token key: ${k}` });
      }
    }
  });

export const themeManifestSchema = z.object({
  preset: z.enum(["default", "ocean", "sunset", "forest"]),
  layout: landingLayoutSchema.optional(),
  tokens: themeTokensSchema,
});

export type ThemeManifest = z.infer<typeof themeManifestSchema>;

const whatsappSettings = z.object({
  phone: z.string().min(5).max(32),
  label: z.string().max(80).optional(),
});

const footerLink = z.object({
  title: z.string().min(1).max(120),
  href: z.string().url().max(2000),
});

const extraFooterSettings = z.object({
  links: z.array(footerLink).max(20),
});

const demoWidgetSettings = z.object({
  title: z.string().max(120).optional(),
});

export const pluginManifestSchema = z.discriminatedUnion("plugin_key", [
  z.object({
    plugin_key: z.literal("whatsapp_widget"),
    settings: whatsappSettings,
    doc_url: z.union([z.string().url().max(2000), z.literal("")]).optional(),
  }),
  z.object({
    plugin_key: z.literal("extra_footer_links"),
    settings: extraFooterSettings,
    doc_url: z.union([z.string().url().max(2000), z.literal("")]).optional(),
  }),
  z.object({
    plugin_key: z.literal("demo_widget"),
    settings: demoWidgetSettings.optional(),
    doc_url: z.union([z.string().url().max(2000), z.literal("")]).optional(),
  }),
]);

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export function validateThemeManifest(input: unknown): ThemeManifest {
  return themeManifestSchema.parse(input);
}

export function safeValidateThemeManifest(input: unknown) {
  return themeManifestSchema.safeParse(input);
}

export function validatePluginManifest(input: unknown): PluginManifest {
  return pluginManifestSchema.parse(input);
}

export function safeValidatePluginManifest(input: unknown) {
  return pluginManifestSchema.safeParse(input);
}

export function isRegisteredPluginKey(s: string): s is RegisteredPluginKey {
  return (REGISTERED_PLUGIN_KEYS as readonly string[]).includes(s);
}

export function defaultPluginSettings(key: RegisteredPluginKey): Record<string, unknown> {
  switch (key) {
    case "whatsapp_widget":
      return { phone: "", label: "Chat" };
    case "extra_footer_links":
      return { links: [] };
    case "demo_widget":
      return { title: "Demo" };
    default:
      return {};
  }
}

export function presetLabel(p: LandingThemePreset): string {
  const map: Record<LandingThemePreset, string> = {
    default: "Default",
    ocean: "Ocean",
    sunset: "Sunset",
    forest: "Forest",
  };
  return map[p];
}
