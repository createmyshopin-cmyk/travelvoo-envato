# Stay UI — Next.js (Envato package)

This folder is a **sanitized copy** of the application for marketplace distribution: **no `node_modules`**, **no `.next` build**, **no `.env.local` secrets**.

## Requirements

- **Node.js** 18+ (20 LTS recommended)
- **npm** (or pnpm/yarn — lockfile is npm)

## First-time setup (buyer)

1. Unzip and open this folder in a terminal.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment template and add **your** keys:

   ```bash
   copy .env.example .env.local
   ```

   On macOS/Linux: `cp .env.example .env.local`

4. Edit `.env.local`:

   - **Supabase**: [Project Settings → API](https://supabase.com/dashboard) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Clerk**: [Clerk Dashboard → API Keys](https://dashboard.clerk.com/) — publishable + secret keys
   - **Envato license (optional)**: verify buyers’ purchase codes against your item ([Envato API](https://build.envato.com/api/)):
     - **`ENVATO_API_TOKEN`** — [Create a personal token](https://build.envato.com/create-token/) on the **seller** account that owns the item. Enable permissions that allow **author / private** sale lookups (as shown in the API docs for “Look up sale by code”).
     - **`ENVATO_ITEM_ID`** — numeric ID from your item URL (e.g. `codecanyon.net/item/your-item-name/12345678` → `12345678`).
     - **`LICENSE_SECRET`** — long random string (e.g. `openssl rand -hex 32`) used only to sign the license cookie on your server. Never share it.
     - **`LICENSE_GATE_ENABLED`** — set to `true` only when you want the **whole site** (except `/license` and `/api/license/*`) to require a valid verified license cookie. Default `false` for local development.

   Buyers activate at **`/license`** by pasting their Envato purchase code. Your server calls `GET https://api.envato.com/v3/market/author/sale?code=…` with your token and checks that the sale’s `item.id` matches **`ENVATO_ITEM_ID`**.

5. Run the dev server (this project uses **port 8080**):

   ```bash
   npm run dev
   ```

   Open [http://localhost:8080](http://localhost:8080).

6. Production build:

   ```bash
   npm run build
   npm run start
   ```

## What is not included

| Excluded | Reason |
|----------|--------|
| `node_modules/` | Run `npm install` |
| `.next/` | Run `npm run dev` or `npm run build` |
| `.env.local` | **Secrets** — buyer creates their own |
| `.clerk/` | Local Clerk dev cache |

## Third-party services

Buyers must create their own accounts for **Supabase**, **Clerk**, **hosting** (e.g. Vercel), and any payment/analytics integrations you enable in code. Review each vendor’s terms of use.

## Documentation

- `MIGRATION.md` — notes from the Vite → Next.js migration.

## Support

Per your Envato license (Regular / Extended), support is handled as described in your item page.
