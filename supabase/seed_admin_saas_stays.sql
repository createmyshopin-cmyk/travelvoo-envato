-- =============================================================================
-- Dev seed: SaaS super admin + tenant admin + sample stays
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres role bypasses RLS).
--
-- Prerequisites (once per project), in order:
--   1. manual_apply_user_roles_core.sql — app_role, user_roles, has_role()
--   2. manual_apply_plans_tenants_core.sql — plans, tenants, tenant_domains, subscriptions, tenant_usage
--   3. manual_apply_stays_room_categories_core.sql — **stays** + **room_categories** (or full migration)
--   Or run supabase/FULL_MIGRATION.sql / `supabase db push` instead of (2)+(3) for the complete schema.
--
-- After success you can log in as:
--   • SaaS:     superadmin@stay.com / superadmin123     → /saas-admin/login
--   • Tenant:   admin@travelvoo.demo / Travelvoo2026!   → /admin/login (subdomain travelvoo)
-- If login says "Invalid login credentials" after an older seed, run once:
--   supabase/manual_fix_seeded_auth_users_instance.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — Super admin (SaaS panel)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_existing_id uuid;
  v_inst uuid;
BEGIN
  SELECT id INTO v_inst FROM auth.instances LIMIT 1;
  IF v_inst IS NULL THEN
    v_inst := '00000000-0000-0000-0000-000000000000';
  END IF;

  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'superadmin@stay.com' LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_existing_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE auth.users
    SET email_confirmed_at = now(), instance_id = v_inst, updated_at = now()
    WHERE id = v_existing_id;
    RAISE NOTICE 'Super admin already exists; role ensured for %', v_existing_id;
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role
  ) VALUES (
    v_user_id,
    v_inst,
    'superadmin@stay.com',
    crypt('superadmin123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Super Admin"}',
    false,
    'authenticated'
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'superadmin@stay.com',
    jsonb_build_object('sub', v_user_id::text, 'email', 'superadmin@stay.com'),
    'email',
    now(), now(), now()
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Super admin created: superadmin@stay.com';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — Tenant admin + 3 stays + 6 room categories (Travelvoo demo)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_user_id   uuid;
  v_tenant_id uuid;
  v_inst      uuid;

  s1 uuid := 'a0ee0001-0000-0000-0000-000000000001';
  s2 uuid := 'a0ee0002-0000-0000-0000-000000000002';
  s3 uuid := 'a0ee0003-0000-0000-0000-000000000003';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@travelvoo.demo' LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_inst FROM auth.instances LIMIT 1;
    IF v_inst IS NULL THEN v_inst := '00000000-0000-0000-0000-000000000000'; END IF;

    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change_token_current,
      email_change, phone_change, phone_change_token, reauthentication_token,
      created_at, updated_at
    ) VALUES (
      v_user_id, v_inst,
      'authenticated', 'authenticated',
      'admin@travelvoo.demo',
      crypt('Travelvoo2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Travelvoo Admin"}'::jsonb,
      '', '', '', '', '', '', '', '',
      now(), now()
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@travelvoo.demo'),
      'email', v_user_id::text,
      now(), now(), now()
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.tenants (
      tenant_name, owner_name, email, domain, status, user_id
    ) VALUES (
      'Travelvoo Demo', 'Travelvoo Admin', 'admin@travelvoo.demo', 'travelvoo', 'active', v_user_id
    ) RETURNING id INTO v_tenant_id;

    INSERT INTO public.tenant_domains (tenant_id, subdomain, verified)
    VALUES (v_tenant_id, 'travelvoo', true);

    INSERT INTO public.tenant_usage (tenant_id)
    VALUES (v_tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;

    IF EXISTS (SELECT 1 FROM public.plans WHERE status = 'active' LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE tenant_id = v_tenant_id) THEN
      INSERT INTO public.subscriptions (
        tenant_id, plan_id, start_date, renewal_date, billing_cycle, status, payment_gateway
      )
      SELECT
        v_tenant_id,
        p.id,
        CURRENT_DATE,
        (CURRENT_DATE + 30),
        'monthly',
        'active',
        ''
      FROM public.plans p
      WHERE p.status = 'active'
      ORDER BY p.price ASC
      LIMIT 1;
    END IF;

    RAISE NOTICE 'Tenant admin created: admin@travelvoo.demo / Travelvoo2026! (subdomain: travelvoo)';
  ELSE
    SELECT t.id INTO v_tenant_id
    FROM public.tenants t
    WHERE t.user_id = v_user_id
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (
        tenant_name, owner_name, email, domain, status, user_id
      ) VALUES (
        'Travelvoo Demo', 'Travelvoo Admin', 'admin@travelvoo.demo', 'travelvoo', 'active', v_user_id
      ) RETURNING id INTO v_tenant_id;

      IF NOT EXISTS (
        SELECT 1 FROM public.tenant_domains td
        WHERE td.tenant_id = v_tenant_id AND LOWER(td.subdomain) = 'travelvoo'
      ) THEN
        INSERT INTO public.tenant_domains (tenant_id, subdomain, verified)
        VALUES (v_tenant_id, 'travelvoo', true);
      END IF;

      INSERT INTO public.tenant_usage (tenant_id)
      VALUES (v_tenant_id)
      ON CONFLICT (tenant_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Tenant admin already present; using tenant_id %', v_tenant_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'seed_admin_saas_stays: could not resolve tenant_id';
  END IF;

  -- Stays
  INSERT INTO public.stays (
    id, stay_id, tenant_id, name, location, description, category,
    rating, reviews_count, price, original_price, amenities, images, status
  ) VALUES
  (
    s1, 'TV-S001', v_tenant_id,
    'Travelvoo Cliffside Retreat',
    'Udaipur, Rajasthan',
    'Lake-facing suites with rooftop dining and curated desert excursions. Ideal showcase property for your Travelvoo catalog.',
    'Luxury Resort', 4.9, 42,
    18500, 24000,
    ARRAY['Free Wi-Fi','Swimming Pool','Spa','Restaurant','Free Breakfast','Air Conditioning'],
    ARRAY[
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80'
    ],
    'active'
  ),
  (
    s2, 'TV-S002', v_tenant_id,
    'Travelvoo Garden Bungalows',
    'Coorg, Karnataka',
    'Coffee-estate bungalows with private verandas, plantation walks, and bonfire evenings.',
    'Couple Friendly', 4.7, 28,
    9200, 12000,
    ARRAY['Free Wi-Fi','Free Breakfast','Bonfire','Garden','Hot Water'],
    ARRAY[
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80'
    ],
    'active'
  ),
  (
    s3, 'TV-S003', v_tenant_id,
    'Travelvoo Family Camp',
    'Wayanad, Kerala',
    'Family cottages, natural pool, and guided jungle trails — perfect for testing multi-room bookings.',
    'Family Stay', 4.6, 55,
    6500, 8900,
    ARRAY['Free Wi-Fi','Swimming Pool','Kid Friendly','Free Parking','Restaurant'],
    ARRAY[
      'https://images.unsplash.com/photo-1510525009256-d4926e8c820f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=800&q=80'
    ],
    'active'
  )
  ON CONFLICT (stay_id) DO NOTHING;

  -- Replace categories for these stays so re-runs do not duplicate rows
  DELETE FROM public.room_categories WHERE stay_id IN (s1, s2, s3);

  -- Room categories (2 per stay)
  INSERT INTO public.room_categories (
    stay_id, tenant_id, name, max_guests, available, amenities, price, original_price, images
  ) VALUES
  (s1, v_tenant_id, 'Royal Lake Suite', 2, 2,
   ARRAY['King Bed','Lake View','Jacuzzi','Butler'],
   18500, 24000,
   ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80']),
  (s1, v_tenant_id, 'Palace Deluxe Room', 2, 4,
   ARRAY['Queen Bed','Courtyard View','En-suite'],
   12500, 17000,
   ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?auto=format&fit=crop&w=800&q=80']),

  (s2, v_tenant_id, 'Estate Cottage', 2, 3,
   ARRAY['King Bed','Plantation View','Fireplace'],
   9200, 12000,
   ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80']),
  (s2, v_tenant_id, 'Garden Studio', 2, 2,
   ARRAY['Double Bed','Garden View','Kitchenette'],
   6800, 9500,
   ARRAY['https://images.unsplash.com/photo-1520250297538-29af9040b14b?auto=format&fit=crop&w=800&q=80']),

  (s3, v_tenant_id, 'Family Jungle Cottage', 6, 3,
   ARRAY['2 Bedrooms','Living Area','Kitchen','Jungle View'],
   6500, 8900,
   ARRAY['https://images.unsplash.com/photo-1484910292437-025e5d13ce87?auto=format&fit=crop&w=800&q=80']),
  (s3, v_tenant_id, 'Adventure Bunk Lodge', 4, 5,
   ARRAY['Bunk Beds','Shared Bath','Lockers'],
   2800, 4200,
   ARRAY['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80']);

  RAISE NOTICE 'Stay seed done: 3 stays + 6 room categories for tenant_id %', v_tenant_id;
END $$;
