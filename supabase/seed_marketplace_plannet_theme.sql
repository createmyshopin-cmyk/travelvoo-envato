-- Free published theme: Plannet (resort green / black / white). Run after marketplace migration.
INSERT INTO public.marketplace_items (
  type, slug, name, description, version, is_published,
  pricing_model, price, currency, manifest, sort_order
)
SELECT
  'theme',
  'plannet',
  'Plannet',
  'Resort-style palette: deep greens with crisp white and charcoal accents. Free to use.',
  '1.0.0',
  true,
  'free',
  0,
  'INR',
  '{"preset":"plannet","layout":"default","tokens":{"--background":"40 20% 98%","--foreground":"160 22% 9%","--primary":"152 42% 28%","--primary-foreground":"0 0% 99%","--secondary":"160 24% 14%","--secondary-foreground":"0 0% 98%","--muted":"150 18% 93%","--muted-foreground":"150 10% 38%","--accent":"142 32% 88%","--accent-foreground":"152 38% 18%","--radius":"0.5rem"}}'::jsonb,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.marketplace_items WHERE slug = 'plannet');
