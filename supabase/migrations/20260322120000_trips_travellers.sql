-- Package/trip traveller limits (adults + children) for booking UI and admin

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS min_adults int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_adults int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_children int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS default_adults int NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.trips.min_adults IS 'Minimum adults required per booking';
COMMENT ON COLUMN public.trips.max_adults IS 'Maximum adults allowed per booking';
COMMENT ON COLUMN public.trips.max_children IS 'Maximum children allowed per booking';
COMMENT ON COLUMN public.trips.default_adults IS 'Initial adults count in booking modal (between min and max)';

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_travellers_adults_valid;
ALTER TABLE public.trips ADD CONSTRAINT trips_travellers_adults_valid CHECK (
  min_adults >= 1
  AND max_adults >= min_adults
  AND default_adults >= min_adults
  AND default_adults <= max_adults
);

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_max_children_valid;
ALTER TABLE public.trips ADD CONSTRAINT trips_max_children_valid CHECK (max_children >= 0);
