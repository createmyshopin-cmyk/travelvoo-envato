-- Enable pg_cron extension (already enabled on Supabase by default)
-- Schedule subscription renewal cron to run daily at 00:05 UTC
-- This calls the subscription-renewal-cron edge function via pg_net

SELECT cron.schedule(
  'subscription-renewal-daily',
  '5 0 * * *',  -- daily at 00:05 UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/subscription-renewal-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
) ON CONFLICT (jobname) DO UPDATE
  SET schedule = '5 0 * * *';
