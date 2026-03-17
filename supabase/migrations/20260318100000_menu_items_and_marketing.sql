-- Menu items for landing page popup + marketing flags in site_settings
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

CREATE POLICY IF NOT EXISTS "Admins can manage menu_items"
  ON public.menu_items
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Marketing-related flags in site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS menu_popup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_popup_title   text    NOT NULL DEFAULT 'Our Menu',
  ADD COLUMN IF NOT EXISTS best_features_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS best_features_title   text    NOT NULL DEFAULT 'Why guests love us',
  ADD COLUMN IF NOT EXISTS coupon_banner_enabled boolean NOT NULL DEFAULT false;

