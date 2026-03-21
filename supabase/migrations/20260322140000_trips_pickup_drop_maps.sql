-- Separate pickup / drop labels + optional map URLs (Google Maps etc.)

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS pickup_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS drop_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_map_url text,
  ADD COLUMN IF NOT EXISTS drop_map_url text;

COMMENT ON COLUMN public.trips.pickup_location IS 'Pickup point label (e.g. city or landmark)';
COMMENT ON COLUMN public.trips.drop_location IS 'Drop-off point label';
COMMENT ON COLUMN public.trips.pickup_map_url IS 'Optional map link for pickup (e.g. Google Maps share URL)';
COMMENT ON COLUMN public.trips.drop_map_url IS 'Optional map link for drop-off';

-- One-time backfill from legacy combined field
UPDATE public.trips
SET pickup_location = trim(pickup_drop_location)
WHERE trim(COALESCE(pickup_location, '')) = ''
  AND pickup_drop_location IS NOT NULL
  AND trim(pickup_drop_location) <> '';
