# Stay Admin (Expo)

## How this connects to the Next.js app

Both apps use the **same Supabase project**. They do **not** talk to each other over HTTP during normal use.

| App | Role |
|-----|------|
| **Next.js** (`NEXT JS/`) | Web UI; uses `NEXT_PUBLIC_SUPABASE_*` |
| **This mobile app** | Native UI; uses `EXPO_PUBLIC_SUPABASE_*` |
| **Supabase** | Database, auth, storage, RLS — shared by both |

So “connecting” the mobile app to Next.js means: **use identical Supabase URL and anon (publishable) key** in both places. Data you create in the web admin appears in the app (and vice versa) because it is the same backend.

## Local development

1. Open `NEXT JS/.env.local` and copy:
   - `NEXT_PUBLIC_SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Create `mobile/.env` with those two variables (see `.env.example`).
3. From this folder:

```bash
npm install
npx expo start
```

Expo loads `.env` automatically for `EXPO_PUBLIC_*` variables.

## EAS builds

`eas.json` can set `EXPO_PUBLIC_*` per profile, or use [EAS Environment variables](https://docs.expo.dev/build-reference/variables/) in the Expo dashboard. Keep preview/production aligned with the same Supabase project you use for the deployed Next.js site.

## Optional: auth redirects (magic links, OAuth)

If you use email links or OAuth, add your app’s URL scheme to **Supabase → Authentication → URL configuration** (e.g. `stayadmin://` from `app.json` → `scheme`).

## When you would call Next.js from the app

Only if you add **Next.js API routes** (`app/api/...`) for server-only logic. The current codebase uses the Supabase client on device; no extra “connect to Next” step is required for that.
