# Envato marketplace package

## Where to edit the Next.js app

**Edit and run the app under `Envato/stay-ui-envato/`** (open that folder in your IDE, `cd` there for `npm install` / `npm run dev`). That is the **Envato / marketplace** Next.js source.

The repo also has a top-level **`NEXT JS/`** folder (historical / internal copy). For **Envato packaging, buyers, and zips**, treat **`Envato/stay-ui-envato/`** as the product — do **not** assume **`NEXT JS/`** stays in sync unless you copy changes over on purpose.

---

This directory contains **`stay-ui-envato/`** — a sanitized copy of the **Next.js** app from the main project, ready to zip for **Envato** (or similar) distribution.

- **Contents:** `stay-ui-envato/` — full source, **excluding** `node_modules`, `.next`, `.env.local`, and `.clerk`.
- **Buyer instructions:** see **`stay-ui-envato/README-ENVATO.md`**.
- **Environment template:** **`stay-ui-envato/.env.example`** (placeholders only — no secrets).
- **Envato API license:** purchase-code verification via [build.envato.com](https://build.envato.com/api/) — routes **`/license`**, **`POST /api/license/verify`**, **`GET /api/license/status`**; optional site-wide gate with **`LICENSE_GATE_ENABLED=true`** (see README-ENVATO).

Before uploading, verify no secrets are inside the zip and that your Envato item description matches the stack (Next.js, Supabase, Clerk, etc.).

## GitHub (Travelvoo Envato)

This workspace’s git **remote** **`travelvoo-envato`** points to **[createmyshopin-cmyk/travelvoo-envato](https://github.com/createmyshopin-cmyk/travelvoo-envato)** (empty until you push). The default **`origin`** is still your main app repo (`stayfinder-2026`).

From the **repository root** (`STAY UI - project`), after committing:

```bash
git push -u travelvoo-envato master
```

Use your usual branch name if it is not `master` (e.g. `main`). To publish **only** `Envato/stay-ui-envato/` as the repo root, use a **subtree** split or a dedicated clone—ask if you want that workflow scripted.
