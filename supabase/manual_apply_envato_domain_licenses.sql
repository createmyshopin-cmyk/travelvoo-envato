-- Envato purchase → domain activations (platform / seller visibility).
-- Apply in Supabase SQL Editor if you use manual_apply_* workflow.

CREATE TABLE IF NOT EXISTS public.envato_domain_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  purchase_code_hash text NOT NULL,
  envato_item_id bigint NOT NULL,
  item_name text,
  license_label text,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT envato_domain_licenses_domain_key UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS envato_domain_licenses_envato_item_id_idx
  ON public.envato_domain_licenses (envato_item_id);

CREATE INDEX IF NOT EXISTS envato_domain_licenses_revoked_at_idx
  ON public.envato_domain_licenses (revoked_at);

ALTER TABLE public.envato_domain_licenses ENABLE ROW LEVEL SECURITY;

-- Inserts are performed by the Next.js API route using the service role key (bypasses RLS).
-- Super admins manage rows from the SaaS admin UI.

DROP POLICY IF EXISTS "super_admin select envato_domain_licenses" ON public.envato_domain_licenses;
CREATE POLICY "super_admin select envato_domain_licenses"
  ON public.envato_domain_licenses FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "super_admin update envato_domain_licenses" ON public.envato_domain_licenses;
CREATE POLICY "super_admin update envato_domain_licenses"
  ON public.envato_domain_licenses FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

COMMENT ON TABLE public.envato_domain_licenses IS 'Envato item activations per domain; hashes only, no plaintext purchase codes.';
