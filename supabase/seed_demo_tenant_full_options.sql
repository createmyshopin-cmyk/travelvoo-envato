-- Full demo data for demo@demo.com: all plan feature flags, generous limits, active subscription,
-- rich site_settings toggles, Plannet theme + tokens, **15 hero slides** (first run only), optional marketplace install.
-- To re-seed heroes after an earlier run: DELETE FROM public.banners WHERE tenant_id = (SELECT id FROM tenants WHERE lower(email) = lower('demo@demo.com')) AND type = 'hero'; then re-run this file.
--
-- Prerequisites:
--   1. Auth user demo@demo.com exists (Supabase Authentication → Users).
--   2. Tenant row exists: run supabase/manual_link_demo_tenant_demo_at_demo_com.sql first.
--   3. Tables: tenants, plans, subscriptions, site_settings (with tenant_id), banners (with tenant_id),
--      optional marketplace_items / tenant_marketplace_installs for Plannet install.
--   4. Optional: **15 catalog stays + promo & announcement banners** — run
--      supabase/seed_demo_stays_and_banners.sql (after this file; skips if tenant already has stays).
--
-- Run in Supabase SQL Editor (or supabase db execute).
--
-- The DO block below prints no result grid — Supabase often shows "Success. No rows returned".
-- That is normal. `RAISE NOTICE` lines appear under **Messages** (not Results). The SELECTs
-- at the bottom return rows so you can confirm the seed in the Results tab.

DO $$
DECLARE
  tid uuid;
  demo_plan_id uuid;
  plannet_item_id uuid;
  n int;
  all_flags jsonb := '{
    "ai_search": true,
    "dynamic_pricing": true,
    "coupons": true,
    "reels": true,
    "invoice_generator": true,
    "quotation_generator": true,
    "custom_domain": true,
    "analytics": true,
    "marketplace": true
  }'::jsonb;
  plannet_tokens jsonb := '{
    "--background": "40 20% 98%",
    "--foreground": "160 22% 9%",
    "--primary": "152 42% 28%",
    "--primary-foreground": "0 0% 99%",
    "--secondary": "160 24% 14%",
    "--secondary-foreground": "0 0% 98%",
    "--muted": "150 18% 93%",
    "--muted-foreground": "150 10% 38%",
    "--accent": "142 32% 88%",
    "--accent-foreground": "152 38% 18%",
    "--radius": "0.5rem"
  }'::jsonb;
BEGIN
  SELECT t.id INTO tid
  FROM public.tenants t
  WHERE lower(t.email) = lower('demo@demo.com')
  LIMIT 1;

  IF tid IS NULL THEN
    RAISE EXCEPTION 'No tenant for demo@demo.com. Run supabase/manual_link_demo_tenant_demo_at_demo_com.sql first.';
  END IF;

  ---------------------------------------------------------------------------
  -- Dedicated plan with every feature flag + high limits (only demo tenant is pointed at it by this script)
  ---------------------------------------------------------------------------
  SELECT p.id INTO demo_plan_id
  FROM public.plans p
  WHERE p.plan_name = 'Demo All Features (Seed)'
  LIMIT 1;

  IF demo_plan_id IS NULL THEN
    INSERT INTO public.plans (
      plan_name,
      price,
      billing_cycle,
      max_stays,
      max_rooms,
      max_bookings_per_month,
      max_ai_search,
      status,
      feature_flags
    ) VALUES (
      'Demo All Features (Seed)',
      0,
      'monthly',
      -1,
      999,
      99999,
      99999,
      'active',
      all_flags
    )
    RETURNING id INTO demo_plan_id;
  ELSE
    UPDATE public.plans
    SET
      feature_flags = all_flags,
      max_stays = -1,
      max_rooms = 999,
      max_bookings_per_month = 99999,
      max_ai_search = 99999,
      status = 'active'
    WHERE id = demo_plan_id;
  END IF;

  UPDATE public.tenants
  SET plan_id = demo_plan_id
  WHERE id = tid;

  ---------------------------------------------------------------------------
  -- plan_features matrix (if table exists): enable all known keys for demo plan
  ---------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plan_features') THEN
    INSERT INTO public.plan_features (id, plan_id, feature_key, enabled)
    SELECT gen_random_uuid(), demo_plan_id, k, true
    FROM unnest(ARRAY[
      'ai_search',
      'dynamic_pricing',
      'coupons',
      'reels',
      'invoice_generator',
      'quotation_generator',
      'custom_domain',
      'analytics',
      'marketplace'
    ]) AS k
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_features pf
      WHERE pf.plan_id = demo_plan_id AND pf.feature_key = k
    );
  END IF;

  ---------------------------------------------------------------------------
  -- Subscription: active, renewed ~1 year out
  ---------------------------------------------------------------------------
  UPDATE public.subscriptions
  SET
    plan_id = demo_plan_id,
    status = 'active',
    renewal_date = (CURRENT_DATE + interval '365 days')::date,
    billing_cycle = COALESCE(NULLIF(billing_cycle, ''), 'monthly')
  WHERE tenant_id = tid;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    INSERT INTO public.subscriptions (
      tenant_id,
      plan_id,
      status,
      renewal_date,
      billing_cycle,
      start_date,
      payment_gateway
    ) VALUES (
      tid,
      demo_plan_id,
      'active',
      (CURRENT_DATE + interval '365 days')::date,
      'monthly',
      CURRENT_DATE::text,
      'manual'
    );
  END IF;

  ---------------------------------------------------------------------------
  -- site_settings: all common toggles on + Plannet theme (requires tenant_id column)
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_settings' AND column_name = 'tenant_id'
  ) THEN
    UPDATE public.site_settings
    SET
      site_name = COALESCE(NULLIF(trim(site_name), ''), 'Demo Resort'),
      contact_email = COALESCE(NULLIF(trim(contact_email), ''), 'demo@demo.com'),
      contact_phone = COALESCE(contact_phone, '+1 555 0100'),
      whatsapp_number = COALESCE(NULLIF(trim(whatsapp_number), ''), '15550101000'),
      address = COALESCE(NULLIF(trim(address), ''), '123 Demo Street, Sample City'),
      currency = COALESCE(NULLIF(trim(currency), ''), 'INR'),
      booking_enabled = true,
      maintenance_mode = false,
      coupon_banner_enabled = true,
      best_features_enabled = true,
      best_features_title = COALESCE(NULLIF(trim(best_features_title), ''), 'Why guests love us'),
      menu_popup_enabled = true,
      menu_popup_title = COALESCE(NULLIF(trim(menu_popup_title), ''), 'Explore'),
      sticky_menu_enabled = true,
      sticky_menu_show_ai = true,
      sticky_menu_show_explore = true,
      sticky_menu_show_reels = true,
      sticky_menu_show_wishlist = true,
      social_instagram = COALESCE(NULLIF(trim(social_instagram), ''), 'https://instagram.com'),
      social_facebook = COALESCE(NULLIF(trim(social_facebook), ''), 'https://facebook.com'),
      social_youtube = COALESCE(NULLIF(trim(social_youtube), ''), 'https://youtube.com'),
      landing_theme_slug = 'plannet',
      theme_tokens = plannet_tokens,
      updated_at = now()
    WHERE tenant_id = tid;

    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
      RAISE NOTICE 'No site_settings row with tenant_id = demo tenant. Create settings in Admin → General once; columns may differ.';
    END IF;
  ELSE
    RAISE NOTICE 'site_settings.tenant_id missing — skipped site_settings update. Add tenant_id or update row manually.';
  END IF;

  ---------------------------------------------------------------------------
  -- Hero banners: 15 slides (only if none exist for this tenant)
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banners' AND column_name = 'tenant_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.banners b WHERE b.tenant_id = tid AND b.type = 'hero'
    ) THEN
      INSERT INTO public.banners (
        tenant_id, type, title, subtitle, cta_text, cta_link, image_url, is_active, sort_order
      ) VALUES
        (tid, 'hero', 'Welcome to Demo Resort', 'Full-feature demo — drag slides in Theme builder to reorder.', 'Browse stays', '/stays', NULL, true, 0),
        (tid, 'hero', 'Infinity pool sunsets', 'Loungers, cabanas, and poolside service until dusk.', 'View pool villas', '/stays', NULL, true, 1),
        (tid, 'hero', 'Spa & wellness', 'Massages, steam, and quiet gardens for deep rest.', 'Book spa', '/stays', NULL, true, 2),
        (tid, 'hero', 'Family suites', 'Connecting rooms, cribs on request, kids'' menu.', 'Family rooms', '/stays', NULL, true, 3),
        (tid, 'hero', 'Couples retreat', 'Private balconies, champagne add-ons, late checkout.', 'Romantic stays', '/stays', NULL, true, 4),
        (tid, 'hero', 'Adventure desk', 'Trekking, kayaking, and local guides every morning.', 'Plan activities', '/stays', NULL, true, 5),
        (tid, 'hero', 'Farm-to-table dining', 'Chef''s tasting menu and terrace seating.', 'Reserve table', '/stays', NULL, true, 6),
        (tid, 'hero', 'Work from anywhere', 'Fast Wi-Fi, quiet corners, and all-day coffee.', 'Day stays', '/stays', NULL, true, 7),
        (tid, 'hero', 'Pet-friendly floors', 'Bowls, beds, and a welcome treat for companions.', 'Pet policy', '/stays', NULL, true, 8),
        (tid, 'hero', 'Events & weddings', 'Lawn ceremonies up to 120 guests, in-house planner.', 'Request quote', '/stays', NULL, true, 9),
        (tid, 'hero', 'Airport transfers', 'Private car or shared shuttle — we track your flight.', 'Add transfer', '/stays', NULL, true, 10),
        (tid, 'hero', 'Local culture night', 'Music, crafts, and storytellers every Friday.', 'See schedule', '/stays', NULL, true, 11),
        (tid, 'hero', 'Eco stays', 'Solar hot water, refill stations, no single-use plastics.', 'Our impact', '/stays', NULL, true, 12),
        (tid, 'hero', 'Long-stay offers', 'Weekly rates with laundry and kitchenette options.', 'Extended stay', '/stays', NULL, true, 13),
        (tid, 'hero', 'Member perks', 'Late checkout, room upgrades when available.', 'Join list', '/stays', NULL, true, 14);
    END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- Marketplace: install Plannet theme if catalog row exists
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_marketplace_installs'
  ) THEN
    SELECT mi.id INTO plannet_item_id
    FROM public.marketplace_items mi
    WHERE mi.slug = 'plannet' AND mi.type = 'theme'
    LIMIT 1;

    IF plannet_item_id IS NOT NULL THEN
      INSERT INTO public.tenant_marketplace_installs (tenant_id, item_id, status, config)
      VALUES (tid, plannet_item_id, 'installed', '{}'::jsonb)
      ON CONFLICT (tenant_id, item_id) DO UPDATE
      SET status = 'installed', updated_at = now();
    END IF;
  END IF;

  RAISE NOTICE 'Demo seed complete for tenant % (demo@demo.com). Plan % (all features).', tid, demo_plan_id;
END $$;

-- ---------------------------------------------------------------------------
-- Verification (these rows should appear in the Results tab)
-- ---------------------------------------------------------------------------
SELECT
  'demo_tenant' AS section,
  t.id AS tenant_id,
  t.email,
  t.plan_id,
  p.plan_name,
  p.feature_flags
FROM public.tenants t
LEFT JOIN public.plans p ON p.id = t.plan_id
WHERE lower(t.email) = lower('demo@demo.com');

SELECT
  'demo_subscription' AS section,
  s.id,
  s.status,
  s.renewal_date,
  s.billing_cycle,
  s.payment_gateway
FROM public.subscriptions s
JOIN public.tenants t ON t.id = s.tenant_id
WHERE lower(t.email) = lower('demo@demo.com')
ORDER BY s.created_at DESC NULLS LAST
LIMIT 5;

SELECT
  'demo_hero_banners' AS section,
  count(*)::int AS hero_slide_count
FROM public.banners b
JOIN public.tenants t ON t.id = b.tenant_id
WHERE lower(t.email) = lower('demo@demo.com') AND b.type = 'hero';

SELECT
  'demo_hero_titles' AS section,
  b.sort_order,
  b.title,
  b.is_active
FROM public.banners b
JOIN public.tenants t ON t.id = b.tenant_id
WHERE lower(t.email) = lower('demo@demo.com') AND b.type = 'hero'
ORDER BY b.sort_order
LIMIT 20;
