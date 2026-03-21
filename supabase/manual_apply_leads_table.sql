-- Run in Supabase Dashboard → SQL Editor if `public.leads` is missing
-- (e.g. error: "Could not find the table 'public.leads' in the schema cache")
--
-- Does NOT touch `popup_settings`. If that table exists in your project and you want
-- template columns, apply `supabase/migrations/20260318103000_popup_templates_and_leads.sql`
-- after `popup_settings` exists, or run migrations normally.

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'popup',
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN ('new', 'contacted', 'converted', 'lost'));
  END IF;
END $$;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage leads" ON public.leads;
CREATE POLICY "Admins can manage leads"
  ON public.leads
  FOR ALL
  USING (public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id())))
  WITH CHECK (public.is_tenant_admin(COALESCE(tenant_id, public.get_my_tenant_id())));
