
-- Remove old single job
SELECT cron.unschedule('daily-rfp-scrape');

-- Batch 0: portals 0-9 at 6:00 AM UTC
SELECT cron.schedule(
  'daily-rfp-scrape-batch-0',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"batch": 0, "batch_size": 10}'::jsonb
  );
  $$
);

-- Batch 1: portals 10-19 at 6:10 AM UTC
SELECT cron.schedule(
  'daily-rfp-scrape-batch-1',
  '10 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"batch": 1, "batch_size": 10}'::jsonb
  );
  $$
);

-- Batch 2: portals 20-29 at 6:20 AM UTC
SELECT cron.schedule(
  'daily-rfp-scrape-batch-2',
  '20 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"batch": 2, "batch_size": 10}'::jsonb
  );
  $$
);
