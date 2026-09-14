CREATE OR REPLACE FUNCTION private.invoke_company_verification(_body jsonb)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'private', 'net'
AS $$
  SELECT net.http_post(
    url := private.cron_setting('supabase_url') || '/functions/v1/company-verification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', private.cron_setting('scrape_cron_token')
    ),
    body := _body,
    timeout_milliseconds := 60000
  );
$$;
REVOKE ALL ON FUNCTION private.invoke_company_verification(jsonb) FROM PUBLIC;

SELECT cron.schedule(
  'expire-company-verifications-daily',
  '45 5 * * *',
  $$SELECT private.invoke_company_verification('{"action":"expire_sweep"}'::jsonb);$$
);
