-- Add analytics/tracking IDs to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ga_id        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fb_pixel_id  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS clarity_id   text DEFAULT '';
