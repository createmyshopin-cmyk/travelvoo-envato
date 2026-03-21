-- Align Meta Graph API version default with Meta dashboard (v25.0)
ALTER TABLE saas_meta_platform_config
  ALTER COLUMN graph_api_version SET DEFAULT 'v25.0';

UPDATE saas_meta_platform_config
SET graph_api_version = 'v25.0'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND graph_api_version IN ('', 'v21.0');
