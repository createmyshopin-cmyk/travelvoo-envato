-- Add per-stay guest count limits (set by admin, enforced in booking form)
ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS max_adults   int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_children int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_pets     int NOT NULL DEFAULT 5;
