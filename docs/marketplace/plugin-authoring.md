# Plugin authoring

## Registered keys

`REGISTERED_PLUGIN_KEYS` in `src/lib/marketplace-manifest.ts`:

| Key | Purpose |
| --- | --- |
| `whatsapp_widget` | `settings`: `phone` (E.164), optional `label` |
| `extra_footer_links` | `settings`: `links[]` with `title`, `href` |
| `demo_widget` | `settings`: optional `title` |

Each key has a Zod branch in `pluginManifestSchema`. Catalog rows reference the same shape under `manifest`.

## Adding a new plugin

1. Implement the feature in the codebase (admin UI, API, public widget as needed).
2. Add the key to `REGISTERED_PLUGIN_KEYS` and extend `pluginManifestSchema` with a new discriminated branch.
3. Extend **Plugin Builder** (`MarketplacePluginBuilderPanel`) with form fields for defaults.
4. On tenant install, merge catalog `manifest.settings` into `tenant_marketplace_installs.config` (existing flows use `config` JSON).

Do not load arbitrary scripts from Storage or manifests — plugins are capability flags + validated JSON only.
