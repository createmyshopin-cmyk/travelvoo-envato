# Vite → Next.js migration (this folder)

## Phase 1 (done) — copy & env

- App source was copied from the root Vite project (`src/`).
- **`src/pages` → `src/spa-pages`**: Next.js reserves `src/pages` for the **Pages Router**. Screen modules live under `spa-pages`; **URLs are defined only in `src/app/`**.
- **Env**: `VITE_SUPABASE_*` → **`NEXT_PUBLIC_SUPABASE_*`** in `src/integrations/supabase/client.ts`. Use `.env.local`.
- **Clerk** (optional): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local` for a permanent app in the Clerk dashboard. **Keyless mode** runs without them (temporary keys + “Configure your application” in the UI). Middleware lives in **`src/proxy.ts`** and is re-exported from **`src/middleware.ts`** (Next.js 15 still resolves `middleware.ts`).
- **Clerk MCP (Cursor)**: use MCP server **`user-clerk`**. Tools: **`list_clerk_sdk_snippets`** (optional `tag`, e.g. `auth`), **`clerk_sdk_snippet`** with **`slug`** (e.g. `server-auth-nextjs`, `show-component`, or bundle `server-side`). Confirms: `clerkMiddleware()` + App Router; `<Show>` needs **`@clerk/nextjs` ≥ 7** (we use 7.x).
- **Envato license + domain registry**: `POST /api/license/verify` (optional `domain`) verifies the code via Envato and sets the license cookie; with **`SUPABASE_SERVICE_ROLE_KEY`** it upserts **`envato_domain_licenses`** (apply **`supabase/manual_apply_envato_domain_licenses.sql`**). Super admins manage rows at **`/saas-admin/envato-licenses`**. Env: **`ENVATO_API_TOKEN`**, **`ENVATO_ITEM_ID`**, **`LICENSE_SECRET`**, optional **`LICENSE_GATE_ENABLED`**, **`LICENSE_REQUIRE_DOMAIN`**, **`SUPABASE_SERVICE_ROLE_KEY`**.

## Phase 2 (done) — real App Router

- **No React Router**: Removed `App.tsx`, `react-router-dom`, and the catch-all route.
- **Routes**: `app/(public)/…` (home, stay, category, wishlist, reels, login, create-account, stays), `app/admin/…`, `app/saas-admin/…`, plus `app/not-found.tsx`.
- **Layouts**: Root `AppProviders` + `TenantGuard`; public segment uses **`PublicMaintenanceGate`** (`app/(public)/layout.tsx`, `dynamic = 'force-dynamic'`).
- **Admin / SaaS**: `AdminLayout` / `SaasAdminLayout` now take **`{children}`** instead of `<Outlet />`; auth redirects use **`next/navigation`**.
- **Links / nav**: `NavLink` and hooks use **`next/link`** + **`usePathname` / `useRouter`**.
- **Supabase browser client**: `localStorage` is only used in the browser; SSR uses an in-memory stub (see `integrations/supabase/client.ts`).
- **Redirect**: `/create-tenant` → `/create-account` in `next.config.ts`.
- **Generators** (optional): `scripts/gen-admin-pages.mjs`, `scripts/gen-saas-pages.mjs` if you add new admin screens and want matching `page.tsx` stubs.

## New / empty Supabase project

If you point `.env.local` at a **fresh** Supabase project, you must apply the **full schema** (migrations or `supabase/FULL_MIGRATION.sql`) so tables like **`stay_reels`**, **`stays`**, **`tenants`**, etc. exist. Until then, queries will fail (e.g. “Failed to fetch reels”) with PostgREST errors like **`PGRST205`** / relation does not exist.

**SaaS super admin only:** if `seed_super_admin.sql` errors with **`public.user_roles` does not exist**, run **`supabase/manual_apply_user_roles_core.sql`** first, then run the seed again. For production, prefer the full migration instead of this minimal roles-only script.

## How to run

```bash
cd "NEXT JS"
npm install
# add .env.local
npm run dev
```

Default dev port is **8080**.

### Blank page + `/_next/static/...` 404 in the browser

Usually happens after **`next build`** and then **`next dev`**: the `.next` folder mixes **production** chunk names with **development** HTML, so scripts like `main-app.js` 404.

1. Stop the dev server.
2. From `NEXT JS/`, delete the `.next` folder **or** run **`npm run dev:clean`** (removes `.next` and starts dev).
3. Do **not** run Vite on the same port: the root Vite app uses **5173**; Next uses **8080**.

## Next steps (phase 3 — polish)

1. **`generateMetadata` / `metadata`** per public route (especially `stay/[id]`, `category/[slug]`) for SEO; trim duplicate client `useDocumentHead` where redundant.
2. **Split Server vs Client**: keep thin `page.tsx` as Server Components where possible; move data fetching to RSC + pass props (optional).
3. **API routes** (`app/api/.../route.ts`) for anything that must stay server-only.
4. **Re-enable** `typescript` / `eslint` in `next.config.ts` when types and rules are cleaned up.
5. **Supabase SSR**: consider `@supabase/ssr` + cookie-based sessions for authenticated server components (optional).

The npm **package** name in `package.json` is `stay-ui-next` (URL-safe). The **folder** on disk is `NEXT JS`. The **Envato marketplace** Next.js copy is **`Envato/stay-ui-envato/`** (`package.json` name: `stay-ui-envato`).

## Mobile app (Expo) — same backend

The **`mobile/`** Expo app does **not** call the Next.js server for data. It uses **`@supabase/supabase-js`** with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `mobile/lib/supabase.ts`). Point those at the **same** Supabase project as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Setup notes: `mobile/README.md`.
