# Marketplace RLS & API

## Tables

| Table | Notes |
| --- | --- |
| `marketplace_items` | Catalog. Tenants: `SELECT` published rows. `super_admin`: all. |
| `tenant_marketplace_installs` | Tenants: own rows via `get_my_tenant_id()`. `super_admin`: all. |
| `site_settings` | Theme columns: `landing_theme_slug`, `theme_tokens` — existing site settings RLS applies. |
| `transactions` | Marketplace linkage: `marketplace_item_id`, `metadata`. Tenant reads own rows; inserts for Razorpay verification use **service role** in API routes. |

## Server routes

| Route | Auth | Notes |
| --- | --- | --- |
| `POST /api/saas-admin/marketplace/ai-suggest` | Bearer session + `super_admin` | OpenAI; rate limited per user. |
| `POST /api/marketplace/create-order` | Bearer session + tenant | Creates Razorpay order; Razorpay secret not exposed. |
| `POST /api/marketplace/verify-payment` | Bearer session + tenant | Verifies signature + payment amount; uses **service role** to insert `transactions` and upsert `tenant_marketplace_installs`. |

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` to the client.
