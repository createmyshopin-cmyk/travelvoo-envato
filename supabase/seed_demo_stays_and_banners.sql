-- Demo stays (15) + promo & announcement banners for demo@demo.com tenant.
-- Home page carousels use exact category labels from Index.tsx.
--
-- Prerequisites: tenant for demo@demo.com (manual_link_demo_tenant_demo_at_demo_com.sql).
-- Idempotent: skips stays if this tenant already has any stay; skips promo/announcement if any exist.
--
-- Run in Supabase SQL Editor after seed_demo_tenant_full_options.sql (order optional).

DO $$
DECLARE
  tid uuid;
BEGIN
  SELECT t.id INTO tid
  FROM public.tenants t
  WHERE lower(t.email) = lower('demo@demo.com')
  LIMIT 1;

  IF tid IS NULL THEN
    RAISE EXCEPTION 'No tenant for demo@demo.com. Run supabase/manual_link_demo_tenant_demo_at_demo_com.sql first.';
  END IF;

  ---------------------------------------------------------------------------
  -- Stays: 15 active properties (only when tenant has zero stays)
  ---------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stays' AND column_name = 'tenant_id')
     AND NOT EXISTS (SELECT 1 FROM public.stays s WHERE s.tenant_id = tid) THEN
    INSERT INTO public.stays (
      tenant_id,
      stay_id,
      name,
      location,
      category,
      description,
      price,
      original_price,
      rating,
      reviews_count,
      amenities,
      images,
      status,
      cooldown_minutes
    ) VALUES
      (tid, 'demo-001', 'Misty Peaks Cottage', 'Wayanad, Kerala', 'Couple Friendly',
       'Private deck, mountain views, and fireplace. Perfect for two.', 6499, 7999, 4.8, 124,
       ARRAY['WiFi', 'Breakfast', 'Parking', 'Mountain view']::text[],
       ARRAY['/assets/stay-1.jpg', '/assets/stay-2.jpg']::text[],
       'active', 1440),
      (tid, 'demo-002', 'Lagoon Hideaway', 'Alleppey, Kerala', 'Couple Friendly',
       'Overwater-inspired suite with canoe breakfast.', 8999, 10999, 4.7, 89,
       ARRAY['WiFi', 'Lake access', 'AC', 'Room service']::text[],
       ARRAY['/assets/stay-3.jpg']::text[],
       'active', 1440),
      (tid, 'demo-003', 'Candlelight Cabin', 'Munnar, Kerala', 'Couple Friendly',
       'Forest-edge cabin with stargazing roof.', 5499, 6999, 4.6, 56,
       ARRAY['WiFi', 'Fireplace', 'Tea estate walk']::text[],
       ARRAY['/assets/stay-4.jpg', '/assets/stay-5.jpg']::text[],
       'active', 1440),

      (tid, 'demo-004', 'Family Fun Resort', 'Ooty, Tamil Nadu', 'Family Stay',
       'Kids club, game room, and interconnecting rooms.', 7999, 9999, 4.5, 210,
       ARRAY['WiFi', 'Pool', 'Kids play', 'Restaurant']::text[],
       ARRAY['/assets/stay-6.jpg']::text[],
       'active', 1440),
      (tid, 'demo-005', 'Beachside Bungalow', 'Varkala, Kerala', 'Family Stay',
       'Sleeps six — kitchenette and lawn games.', 6999, 8499, 4.4, 98,
       ARRAY['WiFi', 'Beach access', 'Kitchenette']::text[],
       ARRAY['/assets/stay-7.jpg', '/assets/stay-8.jpg']::text[],
       'active', 1440),
      (tid, 'demo-006', 'Hillside Family Suites', 'Coorg, Karnataka', 'Family Stay',
       'Two-bedroom suites with jungle safari desk.', 7499, 9200, 4.6, 76,
       ARRAY['WiFi', 'Safari desk', 'Breakfast']::text[],
       ARRAY['/assets/stay-1.jpg']::text[],
       'active', 1440),

      (tid, 'demo-007', 'Royal Palm Villa', 'Udaipur, Rajasthan', 'Luxury Resort',
       'Butler service, private pool, palace views.', 24999, 29999, 4.9, 312,
       ARRAY['WiFi', 'Private pool', 'Butler', 'Spa']::text[],
       ARRAY['/assets/stay-2.jpg', '/assets/stay-3.jpg']::text[],
       'active', 1440),
      (tid, 'demo-008', 'Cliff Infinity Resort', 'Vagator, Goa', 'Luxury Resort',
       'Ocean-facing infinity pool and chef''s table.', 18999, 22999, 4.8, 201,
       ARRAY['WiFi', 'Infinity pool', 'Fine dining']::text[],
       ARRAY['/assets/stay-4.jpg']::text[],
       'active', 1440),
      (tid, 'demo-009', 'Tea Estate Manor', 'Darjeeling, WB', 'Luxury Resort',
       'Heritage suites with estate tours and tasting.', 15999, 18999, 4.7, 167,
       ARRAY['WiFi', 'Heritage tour', 'Tea tasting']::text[],
       ARRAY['/assets/stay-5.jpg', '/assets/stay-6.jpg']::text[],
       'active', 1440),

      (tid, 'demo-010', 'Backpacker Hub', 'Fort Kochi, Kerala', 'Budget Rooms',
       'Clean dorms and private rooms near cafes.', 1299, 1599, 4.2, 445,
       ARRAY['WiFi', 'Shared kitchen', 'Lockers']::text[],
       ARRAY['/assets/stay-7.jpg']::text[],
       'active', 1440),
      (tid, 'demo-011', 'City Express Inn', 'Bangalore, Karnataka', 'Budget Rooms',
       'Metro-near, compact rooms with hot shower.', 1999, 2499, 4.3, 892,
       ARRAY['WiFi', 'AC', '24h desk']::text[],
       ARRAY['/assets/stay-8.jpg']::text[],
       'active', 1440),

      (tid, 'demo-012', 'Azure Pool Villa', 'North Goa', 'Pool Villas',
       'Private plunge pool and outdoor shower.', 12999, 15499, 4.8, 143,
       ARRAY['WiFi', 'Private pool', 'Garden']::text[],
       ARRAY['/assets/stay-1.jpg', '/assets/stay-2.jpg']::text[],
       'active', 1440),
      (tid, 'demo-013', 'Palm Lagoon Villa', 'Kumarakom, Kerala', 'Pool Villas',
       'Lagoon-edge pool and kayak at sunrise.', 11999, 13999, 4.7, 98,
       ARRAY['WiFi', 'Kayaks', 'Pool']::text[],
       ARRAY['/assets/stay-3.jpg']::text[],
       'active', 1440),

      (tid, 'demo-014', 'Canopy Tree House', 'Wayanad, Kerala', 'Tree Houses',
       'Elevated deck among teak trees — birdsong mornings.', 8999, 10999, 4.6, 67,
       ARRAY['WiFi', 'Breakfast', 'Nature walk']::text[],
       ARRAY['/assets/stay-4.jpg', '/assets/stay-5.jpg']::text[],
       'active', 1440),
      (tid, 'demo-015', 'Sky Nest Tree Lodge', 'Sakleshpur, Karnataka', 'Tree Houses',
       'Glass-front tree pod with valley sunrise.', 9499, 11499, 4.7, 54,
       ARRAY['WiFi', 'Balcony', 'Bonfire night']::text[],
       ARRAY['/assets/stay-6.jpg']::text[],
       'active', 1440);

    RAISE NOTICE 'Inserted 15 demo stays for tenant %.', tid;
  ELSE
    RAISE NOTICE 'Skipped stays seed: tenant already has stays, or stays.tenant_id missing.';
  END IF;

  ---------------------------------------------------------------------------
  -- Promo banners (horizontal cards on home)
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banners' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.banners b WHERE b.tenant_id = tid AND b.type = 'promo'
  ) THEN
    INSERT INTO public.banners (
      tenant_id, type, title, subtitle, cta_text, cta_link, image_url, is_active, sort_order
    ) VALUES
      (tid, 'promo', 'Monsoon escape', 'Up to 25% off premium stays this week', 'View offers', '/stays', NULL, true, 0),
      (tid, 'promo', 'Pool villa nights', 'From special nightly rates — limited rooms', 'Book now', '/stays', NULL, true, 1),
      (tid, 'promo', 'Weekend treehouse', 'Two-night min — breakfast included', 'Explore', '/category/tree-houses', NULL, true, 2);
    RAISE NOTICE 'Inserted 3 promo banners for tenant %.', tid;
  ELSE
    RAISE NOTICE 'Skipped promo banners: already present or banners.tenant_id missing.';
  END IF;

  ---------------------------------------------------------------------------
  -- Announcement strips (top of home)
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banners' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.banners b WHERE b.tenant_id = tid AND b.type = 'announcement'
  ) THEN
    INSERT INTO public.banners (
      tenant_id, type, title, subtitle, cta_text, cta_link, image_url, is_active, sort_order
    ) VALUES
      (tid, 'announcement', 'New: Demo catalog live', 'Fifteen sample stays across all categories — try search and filters.', 'Browse stays', '/stays', NULL, true, 0),
      (tid, 'announcement', 'Flexible cancellation', 'Free reschedule up to 48h on select properties.', 'Learn more', '/stays', NULL, true, 1);
    RAISE NOTICE 'Inserted 2 announcement banners for tenant %.', tid;
  ELSE
    RAISE NOTICE 'Skipped announcement banners: already present or banners.tenant_id missing.';
  END IF;
END $$;

SELECT 'demo_stays_count' AS section, count(*)::int AS n
FROM public.stays s
JOIN public.tenants t ON t.id = s.tenant_id
WHERE lower(t.email) = lower('demo@demo.com');

SELECT 'demo_banners_by_type' AS section, b.type, count(*)::int AS n
FROM public.banners b
JOIN public.tenants t ON t.id = b.tenant_id
WHERE lower(t.email) = lower('demo@demo.com')
GROUP BY b.type
ORDER BY b.type;
