-- Document webhook verify token; column already exists (text, unlimited length for hex secrets).
COMMENT ON COLUMN saas_meta_platform_config.webhook_verify_token IS
  'Meta webhook subscription verify token (must match Meta Developer → Webhooks). SaaS Admin can generate a 64-char hex value; save via meta-credentials API.';
