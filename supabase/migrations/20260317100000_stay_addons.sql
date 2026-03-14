-- Create stay_addons table for per-stay bookable add-ons
CREATE TABLE IF NOT EXISTS public.stay_addons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id     uuid        NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  price       numeric     NOT NULL DEFAULT 0,
  optional    boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.stay_addons ENABLE ROW LEVEL SECURITY;

-- Public can read add-ons (shown in booking form)
CREATE POLICY "Public read stay_addons"
  ON public.stay_addons FOR SELECT USING (true);

-- Authenticated users (admins) can manage add-ons
CREATE POLICY "Auth manage stay_addons"
  ON public.stay_addons FOR ALL USING (auth.role() = 'authenticated');
