-- Run in Supabase SQL Editor if REST returns 404 for:
--   popup_settings, menu_items, property_features
-- (same objects as migrations 20260318101000, 20260318100000, 20260318102000)
--
-- Requires: public.tenants, public.site_settings, public.coupons, and role helpers
-- (has_role, etc.) from earlier migrations.

-- ── popup_settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.popup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Book Now',
  cta_link text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  delay_seconds integer NOT NULL DEFAULT 3,
  show_once boolean NOT NULL DEFAULT true,
  coupon_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_settings
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS background_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS stats_text text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'popup_settings_template_type_check'
  ) THEN
    ALTER TABLE public.popup_settings
      ADD CONSTRAINT popup_settings_template_type_check
      CHECK (template_type IN ('lead', 'coupon', 'offer', 'stats', 'announcement'));
  END IF;
END $$;

ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage popup_settings" ON public.popup_settings;
CREATE POLICY "Admins can manage popup_settings"
  ON public.popup_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ── menu_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  description text DEFAULT '',
  price numeric DEFAULT 0,
  image_url text DEFAULT '',
  is_available boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage menu_items" ON public.menu_items;
CREATE POLICY "Admins can manage menu_items"
  ON public.menu_items
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- site_settings marketing columns (skip if table missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_settings'
  ) THEN
    ALTER TABLE public.site_settings
      ADD COLUMN IF NOT EXISTS menu_popup_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS menu_popup_title text NOT NULL DEFAULT 'Our Menu',
      ADD COLUMN IF NOT EXISTS best_features_enabled boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS best_features_title text NOT NULL DEFAULT 'Why guests love us',
      ADD COLUMN IF NOT EXISTS coupon_banner_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── property_features ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  icon_name text NOT NULL DEFAULT 'Star',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage property_features" ON public.property_features;
CREATE POLICY "Admins can manage property_features"
  ON public.property_features
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public coupon flag on coupons (skip if coupons missing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coupons'
  ) THEN
    ALTER TABLE public.coupons
      ADD COLUMN IF NOT EXISTS show_publicly boolean NOT NULL DEFAULT false;
  END IF;
END $$;
