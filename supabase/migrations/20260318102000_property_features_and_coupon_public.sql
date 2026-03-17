-- Per-tenant \"Best Features\" cards for landing page
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

CREATE POLICY IF NOT EXISTS "Admins can manage property_features"
  ON public.property_features
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public coupon banner flag
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS show_publicly boolean NOT NULL DEFAULT false;

