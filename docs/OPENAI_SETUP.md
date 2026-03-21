# OpenAI API key setup (AI Search + Marketplace)

**Never commit API keys.** Use environment variables and hosting secrets only. If a key was shared in chat, email, or a ticket, **rotate it** in the [OpenAI dashboard](https://platform.openai.com/api-keys) and update every place below.

## 1. Marketplace AI (Theme / Plugin Builder)

Used by: `POST /api/saas-admin/marketplace/ai-suggest` (Next.js App Router).

| Where | Variable |
| --- | --- |
| Local dev | `.env.local` (gitignored) |
| Vercel / Node host | Project → Environment Variables |

```bash
OPENAI_API_KEY=sk-...your-new-key...
# optional:
# MARKETPLACE_AI_MODEL=gpt-4o-mini
# MARKETPLACE_AI_MAX_PER_MIN=30
```

Redeploy or restart `next dev` after changing.

## 2. Tenant AI Search (Supabase Edge Function)

Used by: `supabase.functions.invoke("ai-search", ...)` from `AdminAISettings`, `StickyBottomNav`, etc.

The key is **not** read from your Next.js `.env` at runtime for that call — the **Edge Function** runs on Supabase and needs its own secret.

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Edge Functions** → **Secrets**:

- Add secret name: `OPENAI_API_KEY`  
- Value: same key as above (or a dedicated key with appropriate limits)

If your `ai-search` function code expects a different name (e.g. `OPENAI_API_KEY`), match what the function reads.

CLI (if you use Supabase CLI):

```bash
supabase secrets set OPENAI_API_KEY=sk-...your-new-key...
```

Redeploy the `ai-search` function after changing secrets if your workflow requires it.

## 3. Why not store the key in Postgres?

Do **not** put raw API keys in database tables. They appear in backups, logs, and RLS cannot hide them from superusers. Use **environment / secrets** only.

## Checklist

- [ ] Old key revoked if it was exposed
- [ ] `OPENAI_API_KEY` set locally in `.env.local`
- [ ] `OPENAI_API_KEY` set on production host (e.g. Vercel) for Marketplace AI
- [ ] `OPENAI_API_KEY` set in Supabase Edge Function secrets for `ai-search`
