# Marketplace rollout & feature flag

## Flag

Tenant UI (`/admin/marketplace`, sidebar link, dashboard Marketplace tab) is gated by `plan.feature_flags.marketplace` (see `useSubscriptionGuard` / `AdminSidebar`).

When the flag is **off**:

- Tenant admin does not see Marketplace navigation or tab content (existing Stay/Booking flows unchanged).
- Public landing still respects `site_settings` theme columns if set (no catalog required).

SaaS admin catalog routes remain available to `super_admin` for curation.

## Enabling for plans

Run or adapt `supabase/seed_marketplace_feature.sql`, or enable `marketplace` in SaaS Admin plan feature flags.

## Regression checklist (flag off)

- [ ] `/admin` dashboard loads; non-marketplace tabs work.
- [ ] Public homepage loads without Marketplace installed.
- [ ] Billing / plan upgrade flows unchanged.

## Regression checklist (flag on)

- [ ] `/admin/marketplace` lists only published items.
- [ ] Free install + theme activate updates `site_settings` and public styling.
- [ ] Paid flow requires Razorpay env; without keys, create-order returns 503 and UI shows error toast.
