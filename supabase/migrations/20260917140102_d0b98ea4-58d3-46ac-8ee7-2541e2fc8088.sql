CREATE OR REPLACE FUNCTION private.invoke_enrich_rfps(_body jsonb)
RETURNS bigint
LANGUAGE sql
SET search_path = private, net
AS $$
  SELECT net.http_post(
    url := private.cron_setting('supabase_url') || '/functions/v1/enrich-rfps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', private.cron_setting('scrape_cron_token')
    ),
    body := _body,
    timeout_milliseconds := 200000
  );
$$;
REVOKE ALL ON FUNCTION private.invoke_enrich_rfps(jsonb) FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'enrich-rfps-hourly';
SELECT cron.schedule(
  'enrich-rfps-hourly',
  '15 * * * *',
  $$SELECT private.invoke_enrich_rfps('{"action": "run"}'::jsonb)$$
);