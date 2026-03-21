-- Trips & Packages feature: tables, indexes, RLS policies

-- ---------------------------------------------------------------------------
-- trips (main entity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  duration_nights int NOT NULL DEFAULT 1,
  duration_days int NOT NULL DEFAULT 2,
  pickup_drop_location text DEFAULT '',
  images text[] DEFAULT '{}',
  starting_price numeric NOT NULL DEFAULT 0 CHECK (starting_price >= 0),
  original_price numeric NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  discount_label text,
  cancellation_policy jsonb DEFAULT '[]'::jsonb,
  cta_heading text,
  cta_subheading text,
  cta_image_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  seo_title text,
  seo_description text,
  seo_keywords text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_tenant ON public.trips (tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON public.trips (slug);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trips" ON public.trips
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trips" ON public.trips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_itinerary_days
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  day_number int NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_itinerary_days_trip ON public.trip_itinerary_days (trip_id);

ALTER TABLE public.trip_itinerary_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_itinerary_days" ON public.trip_itinerary_days
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_itinerary_days" ON public.trip_itinerary_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_dates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold_out', 'few_left')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_dates_trip ON public.trip_dates (trip_id);

ALTER TABLE public.trip_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_dates" ON public.trip_dates
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_dates" ON public.trip_dates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_inclusions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('included', 'excluded')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_inclusions_trip ON public.trip_inclusions (trip_id);

ALTER TABLE public.trip_inclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_inclusions" ON public.trip_inclusions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_inclusions" ON public.trip_inclusions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_other_info
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_other_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  section_title text NOT NULL DEFAULT '',
  items text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_other_info_trip ON public.trip_other_info (trip_id);

ALTER TABLE public.trip_other_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_other_info" ON public.trip_other_info
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_other_info" ON public.trip_other_info
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_videos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  youtube_url text NOT NULL,
  title text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_videos_trip ON public.trip_videos (trip_id);

ALTER TABLE public.trip_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_videos" ON public.trip_videos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_videos" ON public.trip_videos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trip_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_avatar text DEFAULT '',
  review_title text NOT NULL DEFAULT '',
  review_text text DEFAULT '',
  review_date date DEFAULT CURRENT_DATE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_reviews_trip ON public.trip_reviews (trip_id);

ALTER TABLE public.trip_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read trip_reviews" ON public.trip_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated manage trip_reviews" ON public.trip_reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
