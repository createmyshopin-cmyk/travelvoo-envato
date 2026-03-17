-- Per-tenant promo popup configuration for landing page
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

ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins can manage popup_settings"
  ON public.popup_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

