-- Optional extra tabs on the public trip page (label + body text)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS custom_tabs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.trips.custom_tabs IS
  'JSON array: [{ "label": "FAQ", "body": "..." }, ...] — rendered as extra tabs on /trip/[slug].';
