CREATE TABLE IF NOT EXISTS public.scrape_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoked_by text NOT NULL DEFAULT 'unknown',
  batch integer,
  batch_size integer,
  http_status integer,
  ok boolean NOT NULL DEFAULT false,
  portals_processed integer DEFAULT 0,
  portals_failed integer DEFAULT 0,
  rows_saved integer DEFAULT 0,
  duration_ms integer,
  auth_failure boolean NOT NULL DEFAULT false,
  error_summary text,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scrape_run_log_created_idx ON public.scrape_run_log (created_at DESC);

GRANT SELECT ON public.scrape_run_log TO authenticated;
GRANT ALL ON public.scrape_run_log TO service_role;
ALTER TABLE public.scrape_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read scrape run log" ON public.scrape_run_log;
CREATE POLICY "Admins can read scrape run log" ON public.scrape_run_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.scrape_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  alert_key text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  subject text NOT NULL,
  detail text,
  email_to text,
  email_status text NOT NULL DEFAULT 'pending',
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scrape_alert_log_key_idx ON public.scrape_alert_log (alert_key, created_at DESC);

GRANT SELECT ON public.scrape_alert_log TO authenticated;
GRANT ALL ON public.scrape_alert_log TO service_role;
ALTER TABLE public.scrape_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read scrape alert log" ON public.scrape_alert_log;
CREATE POLICY "Admins can read scrape alert log" ON public.scrape_alert_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));