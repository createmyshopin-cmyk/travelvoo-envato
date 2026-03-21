> **Envato / marketplace:** the packaged Next.js app lives under **`Envato/stay-ui-envato/`**. Edit and ship that folder for Codecanyon — this **`NEXT JS/`** tree may not match it unless you sync manually.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:8080](http://localhost:8080) with your browser to see the result (this project uses port **8080**).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Git repository

Source: **[github.com/createmyshopin-cmyk/NEXT-JS-](https://github.com/createmyshopin-cmyk/NEXT-JS-)**

## Deploy on Vercel

1. **New project from this repo:** [Deploy on Vercel (clone from GitHub)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcreatemyshopin-cmyk%2FNEXT-JS-) — sign in with GitHub if prompted.

2. **Already have a Vercel project?** Connect or change the repo from **project** Git settings (not team settings):
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard) and **click your project** (the app name).
   - In the **left sidebar**, open **Settings** (gear icon at the bottom of the project menu — *not* “Team Settings” from the top team switcher).
   - In the **Settings** sub-menu, click **Git**. (If you don’t see it, scroll the settings list; Vercel documents this as [Git settings](https://vercel.com/docs/project-configuration/git-settings).)
   - Under **Connected Git Repository**, use **Disconnect** / **Connect** and pick **`createmyshopin-cmyk/NEXT-JS-`**.
   - **Direct URL** (replace placeholders): `https://vercel.com/<your-team-slug>/<your-project-name>/settings/git`

3. Copy `.env.local.example` to environment variables in **Settings** → **Environment Variables** (never commit secrets).

See also [Next.js deployment on Vercel](https://nextjs.org/docs/app/building-your-application/deploying).

### Vercel CLI (login + link this folder)

Requires [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`).

```bash
vercel login
```

Approve the device in the browser when prompted. Then from this project root, link to your dashboard project (adjust **scope** / **project** if yours differ):

```bash
vercel link --scope create-my-shop-s-projects --project stayfinder-2026
```

This creates a local **`.vercel/`** folder (gitignored) so `vercel env pull`, `vercel deploy`, etc. target the right project.

### Framework preset (Next.js, not Vite)

This repo is **Next.js** (`next` in `package.json`). The root **`vercel.json`** sets `"framework": "nextjs"` so deployments use the Next builder.

If the dashboard still shows **Vite**: **Project → Settings → General** → **Framework Preset** → choose **Next.js** → Save. Clear any **Output Directory** override left over from Vite (e.g. `dist`); Next.js on Vercel does not use that.
