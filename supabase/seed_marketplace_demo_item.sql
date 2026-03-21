-- Optional: one demo theme for local/staging after marketplace migration is applied.
INSERT INTO public.marketplace_items (
  type, slug, name, description, version, is_published,
  pricing_model, price, currency, manifest, sort_order
)
SELECT
  'theme',
  'ocean-breeze',
  'Ocean Breeze',
  'Cool coastal palette for your landing page.',
  '1.0.0',
  true,
  'free',
  0,
  'INR',
  '{"preset":"ocean","tokens":{"--primary":"199 89% 48%","--secondary":"187 85% 38%"},"layout":"default"}'::jsonb,
  0
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_items WHERE slug = 'ocean-breeze');
