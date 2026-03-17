-- =============================================================================
-- Demo Tenant Seed — Full 60 Demo Data Records
-- =============================================================================
-- Login:    demo@stay.com  /  demo123
-- URL:      /admin/login  →  subdomain: demo
-- Includes: 1 tenant + auth user
--           5 stays + 10 room categories  = 15 records
--           20 bookings                   = 20 records
--           10 invoices                   = 10 records
--           8  coupons                    =  8 records
--           7  quotations                 =  7 records
--                             TOTAL DATA  = 60 records
-- =============================================================================
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rqnxtcigfauzzjaqxzut/sql/new
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- Auth
  v_user_id   uuid;
  v_tenant_id uuid;
  v_inst      uuid;

  -- Stay UUIDs (fixed for repeatable runs — valid hex only)
  s1 uuid := 'de000001-0000-0000-0000-000000000001';
  s2 uuid := 'de000002-0000-0000-0000-000000000002';
  s3 uuid := 'de000003-0000-0000-0000-000000000003';
  s4 uuid := 'de000004-0000-0000-0000-000000000004';
  s5 uuid := 'de000005-0000-0000-0000-000000000005';

BEGIN

  -- ──────────────────────────────────────────────────────────────────────────
  -- GUARD: skip if demo user already exists
  -- ──────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@stay.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Demo tenant already exists (user_id: %). Skipping creation.', v_user_id;
    -- Still resolve tenant_id so data inserts below work on re-runs
    SELECT t.id INTO v_tenant_id
      FROM public.tenants t
      JOIN public.tenant_domains td ON td.tenant_id = t.id
      WHERE td.subdomain = 'demo' LIMIT 1;
  ELSE
    -- ── 1. Create auth user ────────────────────────────────────────────────
    SELECT id INTO v_inst FROM auth.instances LIMIT 1;
    IF v_inst IS NULL THEN v_inst := '00000000-0000-0000-0000-000000000000'; END IF;

    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      -- token fields must be '' not NULL or Supabase auth scan fails
      confirmation_token, recovery_token,
      email_change_token_new, email_change_token_current,
      email_change, phone_change, phone_change_token, reauthentication_token,
      created_at, updated_at
    ) VALUES (
      v_user_id, v_inst,
      'authenticated', 'authenticated',
      'demo@stay.com',
      crypt('demo123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Demo Owner"}'::jsonb,
      '', '', '', '', '', '', '', '',
      now(), now()
    );

    -- ── 2. Auth identity ───────────────────────────────────────────────────
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'demo@stay.com'),
      'email', v_user_id::text,
      now(), now(), now()
    );

    -- ── 3. Admin role ──────────────────────────────────────────────────────
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');

    -- ── 4. Tenant ──────────────────────────────────────────────────────────
    INSERT INTO public.tenants (
      tenant_name, owner_name, email, domain, status, user_id
    ) VALUES (
      'Demo Hospitality', 'Demo Owner', 'demo@stay.com', 'demo', 'active', v_user_id
    ) RETURNING id INTO v_tenant_id;

    -- ── 5. Tenant domain ───────────────────────────────────────────────────
    INSERT INTO public.tenant_domains (tenant_id, subdomain)
    VALUES (v_tenant_id, 'demo');

    -- ── 6. Tenant usage ────────────────────────────────────────────────────
    INSERT INTO public.tenant_usage (tenant_id)
    VALUES (v_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;

    -- ── 7. Subscription (trial on cheapest active plan) ────────────────────
    INSERT INTO public.subscriptions (tenant_id, plan_id, status, billing_cycle, renewal_date)
    SELECT v_tenant_id, p.id, 'active', 'monthly', (CURRENT_DATE + 30)
    FROM public.plans p
    WHERE p.status = 'active'
    ORDER BY p.price ASC
    LIMIT 1;

    RAISE NOTICE 'Demo tenant created → demo@stay.com / demo123 (tenant_id: %)', v_tenant_id;
  END IF;

  -- Bail if still no tenant_id (plans table missing, etc.)
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve demo tenant_id. Aborting.';
  END IF;


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 1 — STAYS  (5 records)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.stays (
    id, stay_id, tenant_id, name, location, description, category,
    rating, reviews_count, price, original_price, amenities, images, status
  ) VALUES

  -- ─── Stay 1 · Sunset Pool Villa ───────────────────────────────────────
  (s1, 'DEMO-S001', v_tenant_id,
   'Sunset Pool Villa',
   'North Goa',
   'A stunning four-bedroom Portuguese villa with a 20-metre infinity pool that vanishes into the horizon. Wraparound verandas, a private chef on request, and a five-minute walk to the beach. Sip sundowners by the pool as the sky turns vermilion over the Arabian Sea.',
   'Pool Villas', 4.9, 87,
   18000, 24000,
   ARRAY['Free Wi-Fi','Swimming Pool','Free Parking','Air Conditioning','TV','Hot Water','Spa','Restaurant','Free Breakfast'],
   ARRAY[
     'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'
   ], 'active'),

  -- ─── Stay 2 · Highland Mountain Lodge ─────────────────────────────────
  (s2, 'DEMO-S002', v_tenant_id,
   'Highland Mountain Lodge',
   'Manali, Himachal Pradesh',
   'Perched above the Beas Valley at 7,200 ft, this alpine lodge offers panoramic Himalayan vistas, a crackling stone fireplace, and guided glacier treks at dawn. Each room is lined with deodar pine and warmed by radiant under-floor heating.',
   'Luxury Resort', 4.8, 64,
   12500, 17000,
   ARRAY['Free Wi-Fi','Free Breakfast','Bonfire','Mountain View','Hot Water','Spa','Gym','Restaurant','Free Parking'],
   ARRAY[
     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1560813889-a6c4acfb7e76?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1520637836993-a0e5b1a2f7a8?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
   ], 'active'),

  -- ─── Stay 3 · Garden Couples Retreat ──────────────────────────────────
  (s3, 'DEMO-S003', v_tenant_id,
   'Garden Couples Retreat',
   'Coorg, Karnataka',
   'A secluded hilltop haven crafted for two. Wake up to coffee-plantation vistas, enjoy a candlelit dinner under the stars, and unwind in your private outdoor bathtub. Silence, luxury, and each other — that''s the only agenda here.',
   'Couple Friendly', 4.7, 112,
   7800, 10500,
   ARRAY['Free Wi-Fi','Free Breakfast','Bonfire','Mountain View','Hot Water','Garden','Spa','Air Conditioning'],
   ARRAY[
     'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
   ], 'active'),

  -- ─── Stay 4 · Jungle Family Camp ──────────────────────────────────────
  (s4, 'DEMO-S004', v_tenant_id,
   'Jungle Family Camp',
   'Wayanad, Kerala',
   'Spread across 8 acres of lush rainforest, this family-friendly camp offers treetop walks, a natural swimming pond, guided wildlife trails, and evening campfire story sessions. Spacious cottages and bunk-bed dorms keep every generation happy.',
   'Family Stay', 4.6, 148,
   5500, 7500,
   ARRAY['Free Wi-Fi','Swimming Pool','Free Breakfast','Garden','Free Parking','Kid Friendly','Pet Friendly','Bonfire','Camping'],
   ARRAY[
     'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80'
   ], 'active'),

  -- ─── Stay 5 · Canopy Treehouse Suite ──────────────────────────────────
  (s5, 'DEMO-S005', v_tenant_id,
   'Canopy Treehouse Suite',
   'Athirapally, Kerala',
   'Sleep in the treetops above one of India''s most dramatic waterfalls. This hand-crafted teak treehouse has floor-to-ceiling glass walls, a suspension-bridge entrance, and an outdoor deck where the falls thunder below you all night long.',
   'Tree Houses', 4.9, 73,
   9500, 13500,
   ARRAY['Free Wi-Fi','Hot Water','Free Breakfast','Mountain View','Garden','Bonfire'],
   ARRAY[
     'https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80'
   ], 'active')

  ON CONFLICT (stay_id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 2 — ROOM CATEGORIES  (10 records = 2 per stay)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.room_categories (stay_id, tenant_id, name, max_guests, available, amenities, price, original_price, images)
  VALUES

  -- s1 – Sunset Pool Villa
  (s1, v_tenant_id, 'Master Infinity Suite',  2, 1,
   ARRAY['King Bed','Private Infinity Pool','Balcony','Rainfall Shower','Mini Bar','Butler'],
   18000, 24000,
   ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']),
  (s1, v_tenant_id, 'Garden Villa Room',       4, 3,
   ARRAY['2 Beds','Pool Access','Garden View','En-suite','Air Conditioning'],
   13000, 18000,
   ARRAY['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80']),

  -- s2 – Highland Mountain Lodge
  (s2, v_tenant_id, 'Valley View Suite',       2, 3,
   ARRAY['King Bed','Mountain View','Fireplace','Soaking Tub','Kitchenette'],
   12500, 17000,
   ARRAY['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80']),
  (s2, v_tenant_id, 'Cosy Alpine Room',        2, 5,
   ARRAY['Double Bed','Mountain View','En-suite','Underfloor Heating'],
   8500, 12000,
   ARRAY['https://images.unsplash.com/photo-1520637836993-a0e5b1a2f7a8?auto=format&fit=crop&w=800&q=80']),

  -- s3 – Garden Couples Retreat
  (s3, v_tenant_id, 'Plunge Pool Cottage',     2, 2,
   ARRAY['King Bed','Private Plunge Pool','Coffee Plantation View','Outdoor Bathtub'],
   7800, 10500,
   ARRAY['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80']),
  (s3, v_tenant_id, 'Deluxe Garden Cabin',     2, 4,
   ARRAY['Queen Bed','Garden View','En-suite','Coffee Maker','Hammock'],
   5500, 7500,
   ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80']),

  -- s4 – Jungle Family Camp
  (s4, v_tenant_id, 'Family Jungle Cottage',   6, 4,
   ARRAY['2 Bedrooms','Living Area','Jungle View','Bunk Beds','Kitchen'],
   5500, 7500,
   ARRAY['https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80']),
  (s4, v_tenant_id, 'Camping Pod (4-Bed)',      4, 6,
   ARRAY['Bunk Beds','Fan','Shared Bathroom','Lockers'],
   2200, 3500,
   ARRAY['https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80']),

  -- s5 – Canopy Treehouse Suite
  (s5, v_tenant_id, 'Waterfall View Treehouse', 2, 1,
   ARRAY['King Bed','Glass Walls','Waterfall View','Outdoor Deck','En-suite'],
   9500, 13500,
   ARRAY['https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?auto=format&fit=crop&w=800&q=80']),
  (s5, v_tenant_id, 'Forest Nest Studio',       2, 3,
   ARRAY['Double Bed','Canopy View','Hammock','Shared Bathroom'],
   5000, 7000,
   ARRAY['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80']);


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 3 — BOOKINGS  (20 records = 4 per stay)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.bookings (
    booking_id, tenant_id, stay_id,
    guest_name, email, phone,
    checkin, checkout,
    adults, children, pets,
    rooms, addons,
    total_price, status,
    solo_traveller, group_booking,
    special_requests, created_at
  ) VALUES

  -- ── Stay 1 bookings ────────────────────────────────────────────────────
  ('BK-D001', v_tenant_id, s1,
   'Rohan Mehta', 'rohan.mehta@example.com', '+91-9812340001',
   CURRENT_DATE - 45, CURRENT_DATE - 42,
   2, 0, 0,
   '[{"name":"Master Infinity Suite","price":18000,"nights":3}]'::jsonb, '[]'::jsonb,
   54000, 'completed', false, false,
   'Please arrange a sunset champagne setup by the pool.', now() - interval '50 days'),

  ('BK-D002', v_tenant_id, s1,
   'Priya & Arjun Singh', 'priya.singh@example.com', '+91-9812340002',
   CURRENT_DATE + 10, CURRENT_DATE + 13,
   2, 0, 0,
   '[{"name":"Master Infinity Suite","price":18000,"nights":3}]'::jsonb, '[]'::jsonb,
   54000, 'confirmed', false, false,
   'Honeymoon booking — flower decoration please.', now() - interval '5 days'),

  ('BK-D003', v_tenant_id, s1,
   'Kartik Rao', 'kartik.rao@example.com', '+91-9812340003',
   CURRENT_DATE - 10, CURRENT_DATE - 8,
   4, 0, 0,
   '[{"name":"Garden Villa Room","price":13000,"nights":2}]'::jsonb, '[]'::jsonb,
   26000, 'completed', false, false,
   NULL, now() - interval '15 days'),

  ('BK-D004', v_tenant_id, s1,
   'Neha Kulkarni', 'neha.kulkarni@example.com', '+91-9812340004',
   CURRENT_DATE + 25, CURRENT_DATE + 28,
   2, 1, 0,
   '[{"name":"Garden Villa Room","price":13000,"nights":3}]'::jsonb, '[]'::jsonb,
   39000, 'pending', false, false,
   'Travelling with a 5-year-old child.', now() - interval '2 days'),

  -- ── Stay 2 bookings ────────────────────────────────────────────────────
  ('BK-D005', v_tenant_id, s2,
   'Vikram Anand', 'vikram.anand@example.com', '+91-9823450001',
   CURRENT_DATE - 30, CURRENT_DATE - 27,
   2, 0, 0,
   '[{"name":"Valley View Suite","price":12500,"nights":3}]'::jsonb, '[]'::jsonb,
   37500, 'completed', false, false,
   'Early check-in if possible.', now() - interval '35 days'),

  ('BK-D006', v_tenant_id, s2,
   'Aditi Sharma', 'aditi.sharma@example.com', '+91-9823450002',
   CURRENT_DATE - 5, CURRENT_DATE - 3,
   2, 0, 0,
   '[{"name":"Cosy Alpine Room","price":8500,"nights":2}]'::jsonb, '[]'::jsonb,
   17000, 'completed', false, false,
   NULL, now() - interval '10 days'),

  ('BK-D007', v_tenant_id, s2,
   'Suresh & Kavya Nair', 'suresh.nair@example.com', '+91-9823450003',
   CURRENT_DATE + 15, CURRENT_DATE + 19,
   2, 0, 0,
   '[{"name":"Valley View Suite","price":12500,"nights":4}]'::jsonb, '[]'::jsonb,
   50000, 'confirmed', false, false,
   'Veg-only meal preference.', now() - interval '3 days'),

  ('BK-D008', v_tenant_id, s2,
   'Aryan Sethi', 'aryan.sethi@example.com', '+91-9823450004',
   CURRENT_DATE - 60, CURRENT_DATE - 58,
   1, 0, 0,
   '[{"name":"Cosy Alpine Room","price":8500,"nights":2}]'::jsonb, '[]'::jsonb,
   17000, 'cancelled', true, false,
   'Solo trek + stay package please.', now() - interval '65 days'),

  -- ── Stay 3 bookings ────────────────────────────────────────────────────
  ('BK-D009', v_tenant_id, s3,
   'Ishaan & Tara Verma', 'ishaan.verma@example.com', '+91-9834560001',
   CURRENT_DATE - 20, CURRENT_DATE - 18,
   2, 0, 0,
   '[{"name":"Plunge Pool Cottage","price":7800,"nights":2}]'::jsonb, '[]'::jsonb,
   15600, 'completed', false, false,
   'Anniversary celebration.', now() - interval '25 days'),

  ('BK-D010', v_tenant_id, s3,
   'Zara Khan', 'zara.khan@example.com', '+91-9834560002',
   CURRENT_DATE + 5, CURRENT_DATE + 8,
   2, 0, 0,
   '[{"name":"Plunge Pool Cottage","price":7800,"nights":3}]'::jsonb, '[]'::jsonb,
   23400, 'confirmed', false, false,
   'Please stock the mini-bar with local Coorg coffee.', now() - interval '1 day'),

  ('BK-D011', v_tenant_id, s3,
   'Dev Choudhary', 'dev.choudhary@example.com', '+91-9834560003',
   CURRENT_DATE - 8, CURRENT_DATE - 6,
   2, 0, 0,
   '[{"name":"Deluxe Garden Cabin","price":5500,"nights":2}]'::jsonb, '[]'::jsonb,
   11000, 'completed', false, false,
   NULL, now() - interval '12 days'),

  ('BK-D012', v_tenant_id, s3,
   'Meera Iyer', 'meera.iyer@example.com', '+91-9834560004',
   CURRENT_DATE + 20, CURRENT_DATE + 23,
   2, 0, 0,
   '[{"name":"Deluxe Garden Cabin","price":5500,"nights":3}]'::jsonb, '[]'::jsonb,
   16500, 'pending', false, false,
   'Require Ayurvedic massage booking.', now() - interval '4 days'),

  -- ── Stay 4 bookings ────────────────────────────────────────────────────
  ('BK-D013', v_tenant_id, s4,
   'Patel Family', 'rajesh.patel@example.com', '+91-9845670001',
   CURRENT_DATE - 15, CURRENT_DATE - 12,
   2, 3, 1,
   '[{"name":"Family Jungle Cottage","price":5500,"nights":3}]'::jsonb, '[]'::jsonb,
   16500, 'completed', false, true,
   'We have a friendly Labrador. Kids aged 5, 8, 10.', now() - interval '20 days'),

  ('BK-D014', v_tenant_id, s4,
   'Sunita Reddy', 'sunita.reddy@example.com', '+91-9845670002',
   CURRENT_DATE + 7, CURRENT_DATE + 9,
   2, 2, 0,
   '[{"name":"Family Jungle Cottage","price":5500,"nights":2}]'::jsonb, '[]'::jsonb,
   11000, 'confirmed', false, false,
   'Allergic to peanuts — please inform kitchen.', now() - interval '6 days'),

  ('BK-D015', v_tenant_id, s4,
   'Group — Nature Club', 'booking@natureclubmumbai.com', '+91-9845670003',
   CURRENT_DATE + 30, CURRENT_DATE + 33,
   8, 0, 0,
   '[{"name":"Camping Pod (4-Bed)","price":2200,"nights":3},{"name":"Camping Pod (4-Bed)","price":2200,"nights":3}]'::jsonb, '[]'::jsonb,
   13200, 'confirmed', false, true,
   'Group of 8 nature enthusiasts. Need guided night safari.', now() - interval '7 days'),

  ('BK-D016', v_tenant_id, s4,
   'Ananya Gupta', 'ananya.gupta@example.com', '+91-9845670004',
   CURRENT_DATE - 90, CURRENT_DATE - 87,
   4, 0, 0,
   '[{"name":"Camping Pod (4-Bed)","price":2200,"nights":3}]'::jsonb, '[]'::jsonb,
   6600, 'cancelled', false, false,
   'Cancelled due to weather advisory.', now() - interval '95 days'),

  -- ── Stay 5 bookings ────────────────────────────────────────────────────
  ('BK-D017', v_tenant_id, s5,
   'Robin & Jiya Thomas', 'robin.thomas@example.com', '+91-9856780001',
   CURRENT_DATE - 12, CURRENT_DATE - 10,
   2, 0, 0,
   '[{"name":"Waterfall View Treehouse","price":9500,"nights":2}]'::jsonb, '[]'::jsonb,
   19000, 'completed', false, false,
   'Birthday surprise — please place balloon decor.', now() - interval '18 days'),

  ('BK-D018', v_tenant_id, s5,
   'George Kurien', 'george.kurien@example.com', '+91-9856780002',
   CURRENT_DATE + 12, CURRENT_DATE + 15,
   2, 0, 0,
   '[{"name":"Waterfall View Treehouse","price":9500,"nights":3}]'::jsonb, '[]'::jsonb,
   28500, 'confirmed', false, false,
   'Late arrival expected around 11 PM.', now() - interval '4 days'),

  ('BK-D019', v_tenant_id, s5,
   'Dhruv Rajput', 'dhruv.rajput@example.com', '+91-9856780003',
   CURRENT_DATE - 3, CURRENT_DATE - 1,
   1, 0, 0,
   '[{"name":"Forest Nest Studio","price":5000,"nights":2}]'::jsonb, '[]'::jsonb,
   10000, 'completed', true, false,
   NULL, now() - interval '8 days'),

  ('BK-D020', v_tenant_id, s5,
   'Sonal & Manoj Pillai', 'sonal.pillai@example.com', '+91-9856780004',
   CURRENT_DATE + 18, CURRENT_DATE + 20,
   2, 0, 0,
   '[{"name":"Forest Nest Studio","price":5000,"nights":2}]'::jsonb, '[]'::jsonb,
   10000, 'pending', false, false,
   'First time visiting — any tips appreciated!', now() - interval '1 day')

  ON CONFLICT (booking_id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 4 — INVOICES  (10 records)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.invoices (
    invoice_id, tenant_id, stay_id,
    guest_name, email, phone,
    checkin, checkout,
    rooms, addons, addons_total,
    room_total, discount, total_price,
    payment_status, payment_notes,
    coupon_code, created_at, updated_at
  ) VALUES

  ('INV-D001', v_tenant_id, s1, 'Rohan Mehta',   'rohan.mehta@example.com',       '+91-9812340001', CURRENT_DATE-45, CURRENT_DATE-42, '[{"name":"Master Infinity Suite","price":18000,"nights":3}]'::jsonb, '[]'::jsonb, 0, 54000, 0,    54000, 'paid',    'Paid via UPI on check-in.', NULL, now()-interval '50 days', now()-interval '45 days'),
  ('INV-D002', v_tenant_id, s1, 'Kartik Rao',    'kartik.rao@example.com',         '+91-9812340003', CURRENT_DATE-10, CURRENT_DATE-8,  '[{"name":"Garden Villa Room","price":13000,"nights":2}]'::jsonb,    '[]'::jsonb, 0, 26000, 2600, 23400, 'paid',    'Paid by card; 10% loyalty discount applied.', 'LOYAL10', now()-interval '15 days', now()-interval '10 days'),
  ('INV-D003', v_tenant_id, s2, 'Vikram Anand',  'vikram.anand@example.com',       '+91-9823450001', CURRENT_DATE-30, CURRENT_DATE-27, '[{"name":"Valley View Suite","price":12500,"nights":3}]'::jsonb,   '[]'::jsonb, 0, 37500, 0,    37500, 'paid',    'Paid via bank transfer.', NULL, now()-interval '35 days', now()-interval '30 days'),
  ('INV-D004', v_tenant_id, s2, 'Aditi Sharma',  'aditi.sharma@example.com',       '+91-9823450002', CURRENT_DATE-5,  CURRENT_DATE-3,  '[{"name":"Cosy Alpine Room","price":8500,"nights":2}]'::jsonb,     '[]'::jsonb, 0, 17000, 0,    17000, 'paid',    'Paid cash at check-out.', NULL, now()-interval '10 days', now()-interval '5 days'),
  ('INV-D005', v_tenant_id, s3, 'Ishaan Verma',  'ishaan.verma@example.com',       '+91-9834560001', CURRENT_DATE-20, CURRENT_DATE-18, '[{"name":"Plunge Pool Cottage","price":7800,"nights":2}]'::jsonb,  '[]'::jsonb, 0, 15600, 1560, 14040, 'paid',    'Paid UPI; WELCOME10 applied.', 'WELCOME10', now()-interval '25 days', now()-interval '20 days'),
  ('INV-D006', v_tenant_id, s3, 'Dev Choudhary', 'dev.choudhary@example.com',      '+91-9834560003', CURRENT_DATE-8,  CURRENT_DATE-6,  '[{"name":"Deluxe Garden Cabin","price":5500,"nights":2}]'::jsonb,  '[]'::jsonb, 0, 11000, 0,    11000, 'paid',    'Paid by card.', NULL, now()-interval '12 days', now()-interval '8 days'),
  ('INV-D007', v_tenant_id, s4, 'Patel Family',  'rajesh.patel@example.com',       '+91-9845670001', CURRENT_DATE-15, CURRENT_DATE-12, '[{"name":"Family Jungle Cottage","price":5500,"nights":3}]'::jsonb,'[]'::jsonb, 0, 16500, 0,    16500, 'paid',    'Paid via net banking.', NULL, now()-interval '20 days', now()-interval '15 days'),
  ('INV-D008', v_tenant_id, s5, 'Robin Thomas',  'robin.thomas@example.com',       '+91-9856780001', CURRENT_DATE-12, CURRENT_DATE-10, '[{"name":"Waterfall View Treehouse","price":9500,"nights":2}]'::jsonb,'[]'::jsonb, 0, 19000, 0, 19000, 'paid',    'Paid via Razorpay.', NULL, now()-interval '18 days', now()-interval '12 days'),
  ('INV-D009', v_tenant_id, s5, 'Dhruv Rajput',  'dhruv.rajput@example.com',       '+91-9856780003', CURRENT_DATE-3,  CURRENT_DATE-1,  '[{"name":"Forest Nest Studio","price":5000,"nights":2}]'::jsonb,   '[]'::jsonb, 0, 10000, 1000, 9000, 'paid',    'Paid cash; NATURE10 applied.', 'NATURE10', now()-interval '8 days', now()-interval '3 days'),
  ('INV-D010', v_tenant_id, s2, 'Suresh Nair',   'suresh.nair@example.com',        '+91-9823450003', CURRENT_DATE+15, CURRENT_DATE+19, '[{"name":"Valley View Suite","price":12500,"nights":4}]'::jsonb,   '[]'::jsonb, 0, 50000, 0,   50000, 'pending', 'Advance of ₹15,000 received. Balance due on check-in.', NULL, now()-interval '3 days', now()-interval '3 days')

  ON CONFLICT (invoice_id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 5 — COUPONS  (8 records)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.coupons (
    tenant_id, code, type, value,
    min_purchase, max_discount,
    description, usage_limit, usage_count, active,
    starts_at, expires_at
  ) VALUES

  (v_tenant_id, 'WELCOME10',    'percentage', 10,  5000,  2000,  'Welcome offer — 10% off for first-time guests.',         50,  12, true,  now()-interval '60 days', now()+interval '90 days'),
  (v_tenant_id, 'LOYAL10',      'percentage', 10,  10000, 3000,  'Loyalty reward — 10% off for returning guests.',         NULL, 8, true,  now()-interval '30 days', now()+interval '180 days'),
  (v_tenant_id, 'NATURE10',     'percentage', 10,  4000,  1500,  'Nature lovers'' special — 10% off treehouse & camp.',    30,   5, true,  now()-interval '15 days', now()+interval '60 days'),
  (v_tenant_id, 'HONEYMOON15',  'percentage', 15,  15000, 5000,  'Honeymoon package — 15% off couple retreats.',           20,   3, true,  now()-interval '30 days', now()+interval '120 days'),
  (v_tenant_id, 'FLAT1000',     'flat',      1000, 8000,  NULL,  'Flat ₹1,000 off on bookings above ₹8,000.',              100, 21, true,  now()-interval '45 days', now()+interval '30 days'),
  (v_tenant_id, 'FLAT2000',     'flat',      2000, 20000, NULL,  'Flat ₹2,000 off on bookings above ₹20,000.',             50,   7, true,  now()-interval '20 days', now()+interval '45 days'),
  (v_tenant_id, 'SUMMER25',     'percentage', 25,  12000, 6000,  'Summer sale — 25% off. Limited-time offer.',             40,  18, true,  now()-interval '10 days', now()+interval '20 days'),
  (v_tenant_id, 'EXPIRED20',    'percentage', 20,  5000,  2500,  'Past campaign — 20% off (expired).',                     30,  30, false, now()-interval '90 days', now()-interval '30 days')

  ON CONFLICT (code) DO NOTHING;


  -- ══════════════════════════════════════════════════════════════════════════
  -- RECORD GROUP 6 — QUOTATIONS  (7 records)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.quotations (
    quote_id, tenant_id, stay_id,
    guest_name, email, phone,
    checkin, checkout,
    rooms, addons, addons_total,
    room_total, discount, total_price,
    status, notes, special_requests,
    created_at, updated_at
  ) VALUES

  ('QT-D001', v_tenant_id, s1, 'Aisha Fernandes',   'aisha.fernandes@example.com',  '+91-9800010001', CURRENT_DATE+20, CURRENT_DATE+24, '[{"name":"Master Infinity Suite","price":18000,"nights":4}]'::jsonb, '[]'::jsonb, 0, 72000, 0,    72000, 'sent',     'Client asked for beach picnic add-on quote.',    'Beach picnic setup and private chef for 2 dinners.', now()-interval '3 days',  now()-interval '3 days'),
  ('QT-D002', v_tenant_id, s2, 'Neeraj Bose',        'neeraj.bose@example.com',      '+91-9800010002', CURRENT_DATE+8,  CURRENT_DATE+11, '[{"name":"Valley View Suite","price":12500,"nights":3}]'::jsonb,    '[]'::jsonb, 0, 37500, 0,    37500, 'draft',    'Corporate offsite — finance team of 2.',         'Need projector and high-speed Wi-Fi confirmation.', now()-interval '1 day',   now()-interval '1 day'),
  ('QT-D003', v_tenant_id, s4, 'School Camp Org',    'camps@greenearth.edu',         '+91-9800010003', CURRENT_DATE+45, CURRENT_DATE+48, '[{"name":"Camping Pod (4-Bed)","price":2200,"nights":3},{"name":"Camping Pod (4-Bed)","price":2200,"nights":3}]'::jsonb, '[]'::jsonb, 0, 13200, 1320, 11880, 'accepted', 'School nature camp for 16 students + 2 teachers.', 'Vegetarian meals only. Need guided trail walks.', now()-interval '5 days',  now()-interval '2 days'),
  ('QT-D004', v_tenant_id, s3, 'Kabir & Simran',     'kabir.weds@example.com',       '+91-9800010004', CURRENT_DATE+35, CURRENT_DATE+38, '[{"name":"Plunge Pool Cottage","price":7800,"nights":3}]'::jsonb,  '[]'::jsonb, 0, 23400, 3510, 19890, 'sent',     'Pre-wedding retreat couple.', 'Flower-decorated room, couples spa package, candlelit dinner.', now()-interval '2 days', now()-interval '2 days'),
  ('QT-D005', v_tenant_id, s5, 'Wildlife Blogger',   'shots@wildlens.in',            '+91-9800010005', CURRENT_DATE+14, CURRENT_DATE+17, '[{"name":"Waterfall View Treehouse","price":9500,"nights":3}]'::jsonb,'[]'::jsonb, 0, 28500, 0,   28500, 'draft',    'Wildlife photography trip — early morning access.',  'Need 4 AM access to forest paths for photography.', now()-interval '4 days',  now()-interval '4 days'),
  ('QT-D006', v_tenant_id, s1, 'Luxury Travel Co.',  'bookings@luxetravel.com',      '+91-9800010006', CURRENT_DATE+60, CURRENT_DATE+64, '[{"name":"Master Infinity Suite","price":18000,"nights":4},{"name":"Garden Villa Room","price":13000,"nights":4}]'::jsonb, '[]'::jsonb, 0, 124000, 12400, 111600, 'accepted', 'Agency booking for high-value client.', 'Airport transfers, welcome hamper, private sunset cruise.', now()-interval '6 days', now()-interval '1 day'),
  ('QT-D007', v_tenant_id, s2, 'Mohit Saxena',       'mohit.saxena@example.com',     '+91-9800010007', CURRENT_DATE-5,  CURRENT_DATE-2,  '[{"name":"Cosy Alpine Room","price":8500,"nights":3}]'::jsonb,     '[]'::jsonb, 0, 25500, 0,   25500, 'expired',  'Lead went cold — follow up scheduled.', 'Asked for snowfall season guarantee.', now()-interval '20 days', now()-interval '5 days')

  ON CONFLICT (quote_id) DO NOTHING;


  RAISE NOTICE '✓ Demo tenant seed complete — 60 data records inserted for tenant_id: %', v_tenant_id;
  RAISE NOTICE '  Stays: 5 | Room Categories: 10 | Bookings: 20 | Invoices: 10 | Coupons: 8 | Quotations: 7';

END $$;
