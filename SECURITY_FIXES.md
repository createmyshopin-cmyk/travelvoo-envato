# Security Hardening — RLS & Authentication Fixes

**Date:** March 2026  
**Scope:** Supabase RLS policies, admin authentication, subdomain isolation

---

## Summary

Full audit and hardening of Row Level Security (RLS) policies across all database tables, fixing cross-tenant data leaks, privilege escalation vulnerabilities, and authentication gaps.

---

## Issues Fixed

### CRITICAL

| ID | Table | Issue | Fix |
|----|-------|-------|-----|
| R-1 | `bookings` | Any admin could SELECT bookings from all tenants | Scoped SELECT to `is_tenant_admin(tenant_id)` |

### HIGH

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| R-2 | `user_roles` | Any admin could self-escalate to `super_admin` | Write access locked to `super_admin` only |
| R-3 | `stay_categories`, `tenant_registrar_keys` | Used generic `has_role(admin)` — cross-tenant access | Replaced with `is_tenant_admin(tenant_id)` |
| R-4 | `site_settings` | Global singleton — shared across all tenants | Added `tenant_id` column; auto-create row trigger for new tenants |
| SD-1 | Login / Auth | Admin login didn't verify subdomain → tenant ownership | `useAdminAuth` + `AdminLogin` now resolve hostname → tenant and verify ownership |

### MEDIUM

| ID | Table | Issue | Fix |
|----|-------|-------|-----|
| R-5 | `stay_addons` | Any authenticated user could manage all tenants' add-ons | Scoped via `stays.tenant_id` join |
| R-6 | `booking_timeline` | Anonymous INSERT allowed (fake audit entries) | Removed anonymous INSERT policy |
| R-7 | `bookings` | Public INSERT lacked `tenant_id` validation | `WITH CHECK` now validates `tenant_id = stay.tenant_id` |
| R-8 | `notifications` | Anonymous INSERT allowed (cross-tenant injection) | Removed (trigger uses SECURITY DEFINER) |
| R-9 | `accounting_transactions` | Generic `has_role(admin)` — any admin manages all | Replaced with `is_tenant_admin(tenant_id)` |
| R-10 | `booking_ledger_entries` | Same as R-9 | Replaced with `is_tenant_admin(tenant_id)` |
| R-11 | `banners` | No `tenant_id` + `WITH CHECK (true)` — any user writes any tenant's banners | Added `tenant_id` column; scoped policy |
| R-12 | `reviews` | Public INSERT had no tenant validation | `WITH CHECK` validates against stay's tenant |
| R-13 | `saas_platform_settings` | All authenticated users could read platform secrets | Restricted to `super_admin` only |

### LOW

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| S-2 | `saas_platform_settings` | Signup page couldn't read subdomain suffix (anon blocked) | Added narrow `anon` SELECT for `setting_key = 'platform_subdomain_suffix'` |

---

## Root Cause — Cross-Tenant Data Leak

**The core bug:** Postgres RLS evaluates all permissive policies with **OR** logic. Public SELECT policies (e.g., `status = 'active'`) had no role restriction (`{public}` = everyone including admins). When an authenticated admin queried any table, both policies fired:

```
(status = 'active')          ← leaked ALL tenants' data  
OR is_tenant_admin(tenant_id) ← correct scoping
```

The OR meant admins saw **all tenants' active data**.

**Fix applied to 11 tables:** Changed `{public}` SELECT policies to `TO anon` — anonymous visitors still browse the booking website, but authenticated admin sessions only hit the properly-scoped `is_tenant_admin` policies.

Tables fixed: `stays`, `room_categories`, `stay_reels`, `nearby_destinations`, `stay_addons`, `calendar_pricing`, `reviews`, `media`, `coupons`, `add_ons`, `banners`, `stay_categories`, `site_settings`

---

## Files Changed

### Database Migrations
- `supabase/migrations/20260326000000_security_hardening.sql` — R-1 through R-7, S-2, SD-1 DB side
- `supabase/migrations/20260326000001_fix_cross_tenant_public_policies.sql` — Cross-tenant public SELECT leak fix

### Frontend Code
- `src/hooks/useAdminAuth.ts` — Added `resolveTenantFromHostname()`, tenant ownership verification
- `src/pages/admin/AdminLogin.tsx` — Subdomain → tenant ownership check at login
- `src/hooks/useSiteSettings.ts` — Filters `site_settings` by resolved tenant

---

## Policy Pattern Reference

All tenant-specific tables now follow this pattern:

```sql
-- Anonymous visitors (public booking website)
CREATE POLICY "Public read ..."
  ON public.table_name FOR SELECT TO anon
  USING (<visibility condition>);

-- Tenant admins (admin panel)
CREATE POLICY "Tenant admin manage ..."
  ON public.table_name FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id) OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (is_tenant_admin(tenant_id) OR has_role(auth.uid(), 'super_admin'));
```
