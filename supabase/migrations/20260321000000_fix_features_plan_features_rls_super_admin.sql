-- Fix features and plan_features RLS: allow super_admin (was 'admin' which SaaS admin doesn't have)
DROP POLICY IF EXISTS "Admins can manage features" ON public.features;
CREATE POLICY "Super admins can manage features" ON public.features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can manage plan_features" ON public.plan_features;
CREATE POLICY "Super admins can manage plan_features" ON public.plan_features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
