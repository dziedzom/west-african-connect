-- 1. Phrasings
CREATE TABLE public.discovery_phrasings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase text NOT NULL UNIQUE,
  language text NOT NULL DEFAULT 'en',
  weight integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_phrasings TO authenticated;
GRANT ALL ON public.discovery_phrasings TO service_role;
ALTER TABLE public.discovery_phrasings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read phrasings" ON public.discovery_phrasings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Sectors
CREATE TABLE public.discovery_sectors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sector text NOT NULL UNIQUE,
  synonyms text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_sectors TO authenticated;
GRANT ALL ON public.discovery_sectors TO service_role;
ALTER TABLE public.discovery_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read discovery sectors" ON public.discovery_sectors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Countries
CREATE TABLE public.discovery_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country text NOT NULL UNIQUE,
  priority integer NOT NULL DEFAULT 100,
  is_priority boolean NOT NULL DEFAULT false,
  candidate_threshold integer NOT NULL DEFAULT 3,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_countries TO authenticated;
GRANT ALL ON public.discovery_countries TO service_role;
ALTER TABLE public.discovery_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read discovery countries" ON public.discovery_countries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Runs
CREATE TABLE public.discovery_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoked_by text NOT NULL DEFAULT 'cron',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  queries_issued integer NOT NULL DEFAULT 0,
  queries_failed integer NOT NULL DEFAULT 0,
  results_returned integer NOT NULL DEFAULT 0,
  results_kept integer NOT NULL DEFAULT 0,
  duplicates_dropped integer NOT NULL DEFAULT 0,
  excluded_dropped integer NOT NULL DEFAULT 0,
  pages_read integer NOT NULL DEFAULT 0,
  candidates_surfaced integer NOT NULL DEFAULT 0,
  est_search_cost_usd numeric NOT NULL DEFAULT 0,
  est_read_cost_usd numeric NOT NULL DEFAULT 0,
  rotation_cursor integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_runs TO authenticated;
GRANT ALL ON public.discovery_runs TO service_role;
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read discovery runs" ON public.discovery_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Results (review queue)
CREATE TABLE public.discovery_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.discovery_runs(id) ON DELETE SET NULL,
  query_text text NOT NULL,
  phrasing text,
  sector text,
  country text,
  url text NOT NULL,
  domain text NOT NULL,
  title text NOT NULL,
  snippet text,
  published_at timestamptz,
  verdict text NOT NULL DEFAULT 'kept',
  verdict_reason text,
  review_state text NOT NULL DEFAULT 'pending',
  review_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL,
  extracted jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_results_verdict_chk CHECK (verdict IN ('kept','duplicate','excluded_domain','non_africa','expired','not_tender')),
  CONSTRAINT discovery_results_review_chk CHECK (review_state IN ('pending','approved','rejected','not_tender','auto_dropped'))
);
CREATE UNIQUE INDEX discovery_results_url_key ON public.discovery_results (url);
CREATE INDEX discovery_results_pending_idx ON public.discovery_results (created_at DESC) WHERE review_state = 'pending';
CREATE INDEX discovery_results_domain_idx ON public.discovery_results (domain);
GRANT SELECT ON public.discovery_results TO authenticated;
GRANT ALL ON public.discovery_results TO service_role;
ALTER TABLE public.discovery_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read discovery results" ON public.discovery_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Candidate sources
CREATE TABLE public.discovery_candidate_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL UNIQUE,
  positive_hits integer NOT NULL DEFAULT 0,
  rejected_hits integer NOT NULL DEFAULT 0,
  not_tender_hits integer NOT NULL DEFAULT 0,
  threshold integer NOT NULL DEFAULT 3,
  surfaced boolean NOT NULL DEFAULT false,
  sample_titles text[] NOT NULL DEFAULT '{}',
  sample_urls text[] NOT NULL DEFAULT '{}',
  queries text[] NOT NULL DEFAULT '{}',
  countries text[] NOT NULL DEFAULT '{}',
  existing_source_id uuid REFERENCES public.scrape_sources(id) ON DELETE SET NULL,
  review_state text NOT NULL DEFAULT 'new',
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_candidates_review_chk CHECK (review_state IN ('new','added','dismissed'))
);
GRANT SELECT ON public.discovery_candidate_sources TO authenticated;
GRANT ALL ON public.discovery_candidate_sources TO service_role;
ALTER TABLE public.discovery_candidate_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read candidate sources" ON public.discovery_candidate_sources FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Rotation state (single row)
CREATE TABLE public.discovery_state (
  id boolean NOT NULL DEFAULT true PRIMARY KEY,
  rotation_cursor integer NOT NULL DEFAULT 0,
  max_queries_per_run integer NOT NULL DEFAULT 60,
  results_per_query integer NOT NULL DEFAULT 10,
  freshness text NOT NULL DEFAULT 'pw',
  paused boolean NOT NULL DEFAULT false,
  paused_reason text,
  last_run_at timestamptz,
  last_run_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_state_single CHECK (id = true)
);
GRANT SELECT ON public.discovery_state TO authenticated;
GRANT ALL ON public.discovery_state TO service_role;
ALTER TABLE public.discovery_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read discovery state" ON public.discovery_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Provenance on listings
ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS discovery_method text NOT NULL DEFAULT 'scrape',
  ADD COLUMN IF NOT EXISTS discovery_result_id uuid;
CREATE INDEX IF NOT EXISTS scraped_rfps_discovery_method_idx ON public.scraped_rfps (discovery_method) WHERE discovery_method <> 'scrape';

-- 9. updated_at triggers
CREATE TRIGGER trg_discovery_phrasings_updated BEFORE UPDATE ON public.discovery_phrasings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discovery_sectors_updated BEFORE UPDATE ON public.discovery_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discovery_countries_updated BEFORE UPDATE ON public.discovery_countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discovery_results_updated BEFORE UPDATE ON public.discovery_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discovery_candidates_updated BEFORE UPDATE ON public.discovery_candidate_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discovery_state_updated BEFORE UPDATE ON public.discovery_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();