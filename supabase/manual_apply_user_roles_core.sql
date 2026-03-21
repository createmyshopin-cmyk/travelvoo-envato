-- =============================================================================
-- Minimal schema for roles: app_role enum, user_roles table, has_role()
-- Run this FIRST if seed_super_admin.sql fails with:
--   relation "public.user_roles" does not exist
-- For a full app database, prefer: supabase/FULL_MIGRATION.sql or `supabase db push`
-- =============================================================================

-- 1) Enum: include super_admin so the seed can insert it
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 2) If app_role existed from an older snapshot without super_admin, add the value (PostgreSQL 15+)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 3) Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Role check (used by API and RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5) RLS: users read own rows; only super_admin can change roles (SQL Editor bypasses RLS for seed)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
