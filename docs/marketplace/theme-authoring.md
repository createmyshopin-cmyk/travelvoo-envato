# Theme authoring

## Presets

Defined in `src/lib/marketplace-theme.ts`:

- `default`, `ocean`, `sunset`, `forest`, `plannet` (resort green / monochrome)

Each preset maps to a CSS class on the landing shell (`LANDING_THEME_PRESET_CLASS`) plus optional preset token hints merged with DB `theme_tokens`.

## Layout ids

Validated in `themeManifestSchema` (`src/lib/marketplace-manifest.ts`):

- `default` — current landing layout
- `heroImmersive` — reserved for future layout variants; safe to store in manifests today

To add a new layout: ship the React layout in the app, add the id to the Zod enum and document it here.

## Allowed CSS variables

Only keys in `ALLOWED_LANDING_THEME_VARS` may appear in `manifest.tokens` or in `site_settings.theme_tokens`. The public `LandingThemeProvider` strips anything else.

## Adding a new preset

1. Add the preset to `LandingThemePreset`, `LANDING_THEME_PRESET_CLASS`, and optional `PRESET_TOKEN_HINTS` in `marketplace-theme.ts`.
2. Add the preset to `themeManifestSchema` in `marketplace-manifest.ts`.
3. Add global CSS for the new class if needed (same file or app CSS).
4. Open a PR — presets are code-reviewed, not uploaded as bundles.
