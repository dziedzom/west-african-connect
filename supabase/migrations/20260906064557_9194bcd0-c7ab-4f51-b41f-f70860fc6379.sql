CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.cron_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.cron_settings FROM PUBLIC, anon, authenticated;
ALTER TABLE private.cron_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO private.cron_settings (key, value) VALUES
  ('supabase_url', 'https://tjuunlzlspznabgldvjr.supabase.co'),
  ('scrape_cron_token', '2a27e65578c8ce59c77f02d05d3cd358b6714c05c14ac5750daa6bd871b9f9ff')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION private.cron_setting(_key text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = private
AS $$ SELECT value FROM private.cron_settings WHERE key = _key $$;
REVOKE ALL ON FUNCTION private.cron_setting(text) FROM PUBLIC, anon, authenticated;

-- Single helper the scheduler calls; keeps credentials out of every cron command.
CREATE OR REPLACE FUNCTION private.invoke_scrape_rfps(_body jsonb)
RETURNS bigint
LANGUAGE sql
SET search_path = private, net
AS $$
  SELECT net.http_post(
    url := private.cron_setting('supabase_url') || '/functions/v1/scrape-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', private.cron_setting('scrape_cron_token')
    ),
    body := _body,
    timeout_milliseconds := 400000
  );
$$;
REVOKE ALL ON FUNCTION private.invoke_scrape_rfps(jsonb) FROM PUBLIC, anon, authenticated;

-- Replace the broken scheduler jobs (2–7) with full batch coverage 0–4.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobid IN (2,3,4,5,6,7);

SELECT cron.schedule('daily-rfp-scrape-batch-0', '0 6 * * *',  $$SELECT private.invoke_scrape_rfps('{"batch": 0, "batch_size": 10}'::jsonb)$$);
SELECT cron.schedule('daily-rfp-scrape-batch-1', '10 6 * * *', $$SELECT private.invoke_scrape_rfps('{"batch": 1, "batch_size": 10}'::jsonb)$$);
SELECT cron.schedule('daily-rfp-scrape-batch-2', '20 6 * * *', $$SELECT private.invoke_scrape_rfps('{"batch": 2, "batch_size": 10}'::jsonb)$$);
SELECT cron.schedule('daily-rfp-scrape-batch-3', '30 6 * * *', $$SELECT private.invoke_scrape_rfps('{"batch": 3, "batch_size": 10}'::jsonb)$$);
SELECT cron.schedule('daily-rfp-scrape-batch-4', '40 6 * * *', $$SELECT private.invoke_scrape_rfps('{"batch": 4, "batch_size": 10}'::jsonb)$$);