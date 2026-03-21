# Marketplace

## Apply database changes

**Easiest (SQL Editor):** run the whole file [`supabase/migrations/20260321130000_marketplace_plannet_theme.sql`](../../supabase/migrations/20260321130000_marketplace_plannet_theme.sql) once. It bootstraps marketplace (if missing) and inserts the free **Plannet** theme. Safe to re-run.

Equivalent one-shot: [`supabase/manual_marketplace_and_plannet.sql`](../../supabase/manual_marketplace_and_plannet.sql) (same idea).

**Or use migrations in order:** `20260321120000_marketplace.sql` then `20260321130000_…` — note the second file repeats the bootstrap with `IF NOT EXISTS`, so running it alone also works. Or `supabase db push` for ordered applies.

Optional demo catalog row: `supabase/seed_marketplace_demo_item.sql`

Optional Plannet-only seed (after base exists): `supabase/seed_marketplace_plannet_theme.sql`

Optional feature/plan wiring: `supabase/seed_marketplace_feature.sql`

**Banners / Theme hero:** `supabase/migrations/20260321140000_banners_tenant_rls.sql` adds `tenant_id` to `public.banners` (if missing), backfills it, and sets RLS so tenant admins can create hero slides from **Theme** and **Banner** admin without `row-level security` errors.

## Operator guide (SaaS admin)

1. **Catalog** — `/saas-admin/marketplace`: create items (or use **Theme Builder** / **Plugin Builder** tabs for structured manifests), set **Published** when ready.
2. **Storage** — preview images can use your existing Supabase Storage patterns; `package_storage_path` on `marketplace_items` is for optional asset references (not executable code).
3. **Payments** — tenant **Pay & install** uses Razorpay orders via Next.js routes (`/api/marketplace/create-order`, `/api/marketplace/verify-payment`). Configure server env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, plus `SUPABASE_SERVICE_ROLE_KEY` (verify route writes transactions + installs).
4. **Analytics** — SaaS Marketplace tab includes installs-by-item and revenue-by-item charts (successful transactions with `marketplace_item_id`).

## Tenant admin

- **Route:** `/admin/marketplace` (requires `marketplace` in the tenant plan `feature_flags`).
- **Free** items: **Install** then **Activate on site** for themes (`site_settings.landing_theme_slug`, `theme_tokens`).
- **Paid** items: **Pay & install** (Razorpay) then activate/configure as above.

## Presets & safety

- Theme presets and allowlisted CSS variables: `src/lib/marketplace-theme.ts`.
- Manifest validation (Zod): `src/lib/marketplace-manifest.ts`.
- Public site applies tokens via `LandingThemeProvider` (allowlisted variables only).

## Further reading

| Doc | Purpose |
| --- | --- |
| [../OPENAI_SETUP.md](../OPENAI_SETUP.md) | **OpenAI key** for Marketplace AI + Supabase `ai-search` (not stored in DB) |
| [theme-authoring.md](./theme-authoring.md) | Presets, layouts, adding tokens safely |
| [plugin-authoring.md](./plugin-authoring.md) | Registering `plugin_key`, config schemas |
| [rls-api.md](./rls-api.md) | Tables, policies, which routes use service role |
| [ai-builders.md](./ai-builders.md) | AI assist env, auth, rate limits |
| [rollout.md](./rollout.md) | Feature flag, regression checklist |
