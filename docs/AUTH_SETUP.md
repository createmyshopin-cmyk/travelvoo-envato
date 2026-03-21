# Supabase Authentication Setup

## Overview

The app supports:
- **Sign up** (email + password) → `/create-account` → creates tenant + 3-day trial
- **Sign in** (email + password) → `/login` → tenant dashboard
- **Sign up with Google** → `/create-account` → fill company + subdomain, then Google OAuth
- **Sign in with Google** → `/login` → tenant dashboard

## Enable Google OAuth (Supabase Dashboard)

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Enable **Google**
3. Add your **Google Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. In Google Cloud Console:
   - Create OAuth 2.0 credentials (Web application)
   - Add **Authorized redirect URIs**:
     - `https://aoyznmofhgibmuhstrio.supabase.co/auth/v1/callback`
5. In Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://yourdomain.com` (or Vercel URL)
   - **Redirect URLs**: Add `https://yourdomain.com/login`, `https://yourdomain.com/create-account` (and subdomains if needed)

## Database

No schema changes needed. OAuth users are stored in `auth.users` (Supabase). Tenant data uses:
- `tenants` (user_id links auth user)
- `user_roles` (admin role)
- `tenant_domains`, `subscriptions`, `tenant_usage` (as with email signup)

## Edge Functions

| Function                  | Purpose                          |
|---------------------------|----------------------------------|
| `create-tenant-signup`    | Email/password tenant signup     |
| `create-tenant-from-oauth`| Google OAuth tenant signup       |

Both are configured with `verify_jwt = false` (create-tenant-signup is public; create-tenant-from-oauth validates JWT manually).
