ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS value_amount numeric,
  ADD COLUMN IF NOT EXISTS value_currency text,
  ADD COLUMN IF NOT EXISTS value_basis text,
  ADD COLUMN IF NOT EXISTS value_evidence text,
  ADD COLUMN IF NOT EXISTS value_source_url text,
  ADD COLUMN IF NOT EXISTS value_confidence text,
  ADD COLUMN IF NOT EXISTS needs_fx_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS official_source_url text,
  ADD COLUMN IF NOT EXISTS document_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enrichment_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_scraped_rfps_enrichment_queue
  ON public.scraped_rfps (enrichment_status, deadline)
  WHERE enrichment_status = 'pending';

CREATE TABLE IF NOT EXISTS public.enrichment_job_state (
  id boolean NOT NULL PRIMARY KEY DEFAULT true,
  lease_until timestamp with time zone,
  lease_holder text,
  paused boolean NOT NULL DEFAULT false,
  paused_reason text,
  paused_at timestamp with time zone,
  last_run_at timestamp with time zone,
  last_run_processed integer NOT NULL DEFAULT 0,
  last_run_values_found integer NOT NULL DEFAULT 0,
  last_run_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT enrichment_job_state_singleton CHECK (id = true)
);

GRANT SELECT ON public.enrichment_job_state TO authenticated;
GRANT ALL ON public.enrichment_job_state TO service_role;

ALTER TABLE public.enrichment_job_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view enrichment job state" ON public.enrichment_job_state;
CREATE POLICY "Admins can view enrichment job state"
  ON public.enrichment_job_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_enrichment_job_state_updated_at ON public.enrichment_job_state;
CREATE TRIGGER update_enrichment_job_state_updated_at
  BEFORE UPDATE ON public.enrichment_job_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.enrichment_job_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.refresh_homepage_live_stats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  WITH current_rfps AS (
    SELECT id, value_amount, value_currency, location
    FROM public.scraped_rfps
    WHERE africa_relevant = true
      AND status IN ('open', 'closing_soon')
      AND deadline IS NOT NULL
      AND deadline >= now()
  ), value_by_rfp AS (
    SELECT id, value_amount AS recorded_value
    FROM current_rfps
    WHERE value_amount IS NOT NULL
      AND value_amount > 0
      AND upper(coalesce(value_currency, 'USD')) = 'USD'
  ), africa_countries(country) AS (
    VALUES
      ('Algeria'), ('Angola'), ('Benin'), ('Botswana'), ('Burkina Faso'), ('Burundi'),
      ('Cabo Verde'), ('Cameroon'), ('Central African Republic'), ('Chad'), ('Comoros'),
      ('Congo'), ('Democratic Republic of the Congo'), ('Djibouti'), ('Egypt'),
      ('Equatorial Guinea'), ('Eritrea'), ('Eswatini'), ('Ethiopia'), ('Gabon'), ('Gambia'),
      ('Ghana'), ('Guinea'), ('Guinea-Bissau'), ('Ivory Coast'), ('Cote d''Ivoire'),
      ('Kenya'), ('Lesotho'), ('Liberia'), ('Libya'), ('Madagascar'), ('Malawi'), ('Mali'),
      ('Mauritania'), ('Mauritius'), ('Morocco'), ('Mozambique'), ('Namibia'), ('Niger'),
      ('Nigeria'), ('Rwanda'), ('Sao Tome and Principe'), ('Senegal'), ('Seychelles'),
      ('Sierra Leone'), ('Somalia'), ('South Africa'), ('South Sudan'), ('Sudan'),
      ('Tanzania'), ('Togo'), ('Tunisia'), ('Uganda'), ('Zambia'), ('Zimbabwe')
  ), represented_countries AS (
    SELECT DISTINCT ac.country
    FROM current_rfps r
    JOIN africa_countries ac ON r.location ILIKE '%' || ac.country || '%'
  )
  INSERT INTO public.homepage_live_stats (
    id, live_opportunities, total_recorded_value, opportunities_with_recorded_value,
    active_sources, countries_represented, updated_at
  )
  VALUES (
    true,
    (SELECT count(*)::integer FROM current_rfps),
    (SELECT coalesce(sum(recorded_value), 0) FROM value_by_rfp),
    (SELECT count(*)::integer FROM value_by_rfp),
    (SELECT count(*)::integer FROM public.scrape_sources WHERE enabled = true AND (auto_disabled_until IS NULL OR auto_disabled_until <= now())),
    (SELECT count(*)::integer FROM represented_countries),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET live_opportunities = EXCLUDED.live_opportunities,
      total_recorded_value = EXCLUDED.total_recorded_value,
      opportunities_with_recorded_value = EXCLUDED.opportunities_with_recorded_value,
      active_sources = EXCLUDED.active_sources,
      countries_represented = EXCLUDED.countries_represented,
      updated_at = EXCLUDED.updated_at;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_homepage_live_stats()
 RETURNS TABLE(live_opportunities integer, total_recorded_value numeric, opportunities_with_recorded_value integer, active_sources integer, countries_represented integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT live_opportunities, total_recorded_value, opportunities_with_recorded_value,
         active_sources, countries_represented
  FROM public.homepage_live_stats WHERE id = true;
$function$;