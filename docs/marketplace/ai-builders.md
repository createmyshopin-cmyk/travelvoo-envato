# Marketplace AI assist

Server route: `POST /api/saas-admin/marketplace/ai-suggest`

## Environment

Copy from `.env.local.example`:

- `OPENAI_API_KEY` — required for AI responses
- `MARKETPLACE_AI_MODEL` — optional, default `gpt-4o-mini`
- `MARKETPLACE_AI_MAX_PER_MIN` — optional cap per authenticated user (default 30 requests per sliding minute)

## Auth

Send `Authorization: Bearer <Supabase access token>` for a user with `super_admin` role.

## Request body

```json
{ "brief": "coastal boutique hotel", "type": "theme" | "plugin", "plugin_key": "whatsapp_widget" }
```

`plugin_key` is optional; when provided for `type: "plugin"`, the model is nudged toward that key.

## Response

- Success: `{ "manifest": { ... } }` — output is validated with Zod (`themeManifestSchema` or `pluginManifestSchema`). Invalid model output returns `422` with issue details.
- Rate limit: `429` with `Retry-After` and `{ "code": "RATE_LIMIT" }`.
- AI disabled: `503` with `{ "code": "AI_DISABLED" }` when `OPENAI_API_KEY` is unset — Theme/Plugin Builder falls back to manual fields.

## Security

The route never returns raw model output without passing schema validation; prompts are server-only.
