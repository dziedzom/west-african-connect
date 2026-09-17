CREATE TABLE IF NOT EXISTS public.homepage_live_stats (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  live_opportunities integer NOT NULL DEFAULT 0,
  total_recorded_value numeric NOT NULL DEFAULT 0,
  opportunities_with_recorded_value integer NOT NULL DEFAULT 0,
  active_sources integer NOT NULL DEFAULT 0,
  countries_represented integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_live_stats TO anon, authenticated;
GRANT ALL ON public.homepage_live_stats TO service_role;
ALTER TABLE public.homepage_live_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view homepage live stats" ON public.homepage_live_stats;
CREATE POLICY "Anyone can view homepage live stats"
ON public.homepage_live_stats
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.refresh_homepage_live_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH current_rfps AS (
    SELECT id, budget, location
    FROM public.scraped_rfps
    WHERE africa_relevant = true
      AND status IN ('open', 'closing_soon')
      AND deadline IS NOT NULL
      AND deadline >= now()
  ), value_matches AS (
    SELECT
      id,
      (match_data)[1]::numeric AS amount,
      lower(coalesce((match_data)[2], '')) AS suffix
    FROM current_rfps
    CROSS JOIN LATERAL regexp_matches(coalesce(budget, ''), '([0-9][0-9,]*(?:\.[0-9]+)?)\s*(m|million|k|thousand)?', 'i') AS match_data
  ), value_by_rfp AS (
    SELECT
      id,
      max(
        amount * CASE
          WHEN suffix IN ('m', 'million') THEN 1000000
          WHEN suffix IN ('k', 'thousand') THEN 1000
          ELSE 1
        END
      ) AS recorded_value
    FROM value_matches
    GROUP BY id
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
    id,
    live_opportunities,
    total_recorded_value,
    opportunities_with_recorded_value,
    active_sources,
    countries_represented,
    updated_at
  )
  VALUES (
    true,
    (SELECT count(*)::integer FROM current_rfps),
    (SELECT coalesce(sum(recorded_value), 0) FROM value_by_rfp),
    (SELECT count(*)::integer FROM value_by_rfp WHERE recorded_value > 0),
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
$$;

REVOKE ALL ON FUNCTION public.refresh_homepage_live_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_homepage_live_stats() TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_refresh_homepage_live_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_homepage_live_stats();
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_refresh_homepage_live_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_refresh_homepage_live_stats() TO service_role;

DROP TRIGGER IF EXISTS trg_refresh_homepage_live_stats_on_rfps ON public.scraped_rfps;
CREATE TRIGGER trg_refresh_homepage_live_stats_on_rfps
AFTER INSERT OR UPDATE OR DELETE ON public.scraped_rfps
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_homepage_live_stats();

DROP TRIGGER IF EXISTS trg_refresh_homepage_live_stats_on_sources ON public.scrape_sources;
CREATE TRIGGER trg_refresh_homepage_live_stats_on_sources
AFTER INSERT OR UPDATE OR DELETE ON public.scrape_sources
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_homepage_live_stats();

SELECT public.refresh_homepage_live_stats();