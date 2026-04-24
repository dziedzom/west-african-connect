
-- 1. Enum for source categories
DO $$ BEGIN
  CREATE TYPE public.scrape_source_category AS ENUM (
    'multilateral', 'bilateral_donor', 'african_government', 'regional_body', 'aggregator', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on scraped_rfps (additive, all nullable / safe defaults)
ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS source_category public.scrape_source_category,
  ADD COLUMN IF NOT EXISTS source_domain text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS africa_relevant boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS additional_source_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_scraped_rfps_content_hash ON public.scraped_rfps(content_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_rfps_africa_relevant ON public.scraped_rfps(africa_relevant) WHERE africa_relevant = true;
CREATE INDEX IF NOT EXISTS idx_scraped_rfps_source_domain ON public.scraped_rfps(source_domain);

-- Backfill source_domain from source_url for existing rows
UPDATE public.scraped_rfps
SET source_domain = lower(regexp_replace(split_part(split_part(source_url, '://', 2), '/', 1), '^www\.', ''))
WHERE source_domain IS NULL AND source_url IS NOT NULL;

-- 3. scrape_sources table — admin-managed catalog of portals
CREATE TABLE IF NOT EXISTS public.scrape_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  url text NOT NULL,
  domain text NOT NULL,
  category public.scrape_source_category NOT NULL DEFAULT 'other',
  priority integer NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  enabled boolean NOT NULL DEFAULT true,
  auto_disabled_until timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  total_runs integer NOT NULL DEFAULT 0,
  successful_runs integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view scrape sources" ON public.scrape_sources;
CREATE POLICY "Admins can view scrape sources"
  ON public.scrape_sources FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert scrape sources" ON public.scrape_sources;
CREATE POLICY "Admins can insert scrape sources"
  ON public.scrape_sources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update scrape sources" ON public.scrape_sources;
CREATE POLICY "Admins can update scrape sources"
  ON public.scrape_sources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete scrape sources" ON public.scrape_sources;
CREATE POLICY "Admins can delete scrape sources"
  ON public.scrape_sources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_scrape_sources_updated_at ON public.scrape_sources;
CREATE TRIGGER trg_scrape_sources_updated_at
  BEFORE UPDATE ON public.scrape_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed sources (existing + new). ON CONFLICT (name) keeps existing rows intact.
INSERT INTO public.scrape_sources (name, url, domain, category, priority) VALUES
  -- Existing portals (preserve)
  ('UNGM', 'https://www.ungm.org/Public/Notice', 'ungm.org', 'multilateral', 1),
  ('AfDB', 'https://www.afdb.org/en/projects-and-operations/procurement', 'afdb.org', 'multilateral', 1),
  ('DevBusiness', 'https://www.devbusiness.com/default.aspx', 'devbusiness.com', 'aggregator', 2),
  ('UNDP Procurement', 'https://procurement-notices.undp.org/', 'undp.org', 'multilateral', 1),
  ('World Bank', 'https://projects.worldbank.org/en/projects-operations/procurement', 'worldbank.org', 'multilateral', 1),
  ('TenderInfo Africa', 'https://www.tendersinfo.com/global-africa-tenders.php', 'tendersinfo.com', 'aggregator', 2),
  ('ECOWAS', 'https://www.ecowas.int/procurement/', 'ecowas.int', 'regional_body', 3),
  ('SADC', 'https://www.sadc.int/opportunities/procurement', 'sadc.int', 'regional_body', 3),
  ('AU Commission', 'https://au.int/en/bids', 'au.int', 'regional_body', 3),
  ('COMESA', 'https://www.comesa.int/procurement/', 'comesa.int', 'regional_body', 3),
  ('EAC', 'https://www.eac.int/procurement', 'eac.int', 'regional_body', 3),
  ('SA eTenders', 'https://www.etenders.gov.za/Home/opportunities', 'etenders.gov.za', 'african_government', 2),
  ('Botswana PPADB', 'https://www.ppadb.co.bw/tenders', 'ppadb.co.bw', 'african_government', 2),
  ('Zambia ZPPA', 'https://www.zppa.org.zm/tenders', 'zppa.org.zm', 'african_government', 2),
  ('Mozambique', 'https://www.ufsa.gov.mz/concursos', 'ufsa.gov.mz', 'african_government', 2),
  ('Namibia CPB', 'https://www.cpb.gov.na/tenders.html', 'cpb.gov.na', 'african_government', 2),
  ('Nigeria BPP', 'https://www.bpp.gov.ng/opportunities/', 'bpp.gov.ng', 'african_government', 2),
  ('Ghana PPA', 'https://www.ppa.gov.gh/tenders', 'ppa.gov.gh', 'african_government', 2),
  ('Senegal ARMP', 'https://www.marchespublics.sn/', 'marchespublics.sn', 'african_government', 2),
  ('Côte d''Ivoire', 'https://www.marchespublics-ci.net/', 'marchespublics-ci.net', 'african_government', 2),
  ('Kenya PPRA', 'https://www.ppra.go.ke/tenders/', 'ppra.go.ke', 'african_government', 2),
  ('Tanzania PPRA', 'https://www.ppra.go.tz/tenders', 'ppra.go.tz', 'african_government', 2),
  ('Uganda PPDA', 'https://www.ppda.go.ug/opportunities/', 'ppda.go.ug', 'african_government', 2),
  ('Rwanda RPP', 'https://www.rppa.gov.rw/tenders', 'rppa.gov.rw', 'african_government', 2),
  ('Ethiopia FPPA', 'https://www.fppa.gov.et/tenders.html', 'fppa.gov.et', 'african_government', 2),
  ('Egypt Tenders', 'https://etenders.gov.eg/', 'etenders.gov.eg', 'african_government', 2),
  ('Morocco MP', 'https://www.marchespublics.gov.ma/', 'marchespublics.gov.ma', 'african_government', 2),
  ('Tunisia TUNEPS', 'https://www.tuneps.tn/', 'tuneps.tn', 'african_government', 2),
  -- NEW: Multilateral / development agencies (priority 1)
  ('Islamic Development Bank', 'https://www.isdb.org/procurement', 'isdb.org', 'multilateral', 1),
  ('Green Climate Fund', 'https://www.greenclimate.fund/procurement', 'greenclimate.fund', 'multilateral', 1),
  ('Global Fund', 'https://www.theglobalfund.org/en/sourcing-procurement/', 'theglobalfund.org', 'multilateral', 1),
  ('Gavi Alliance', 'https://www.gavi.org/operating-model/business-gavi', 'gavi.org', 'multilateral', 1),
  ('ReliefWeb Jobs', 'https://reliefweb.int/jobs', 'reliefweb.int', 'aggregator', 1),
  -- NEW: Bilateral donor agencies (priority 2)
  ('USAID SAM.gov', 'https://sam.gov/search?index=opp&page=1&pageSize=25&sfm[simpleSearch][searchString]=africa', 'sam.gov', 'bilateral_donor', 2),
  ('UK FCDO Contracts Finder', 'https://www.contractsfinder.service.gov.uk/Search', 'contractsfinder.service.gov.uk', 'bilateral_donor', 2),
  ('GIZ Germany', 'https://www.giz.de/en/worldwide/worldwide.html', 'giz.de', 'bilateral_donor', 2),
  ('AFD France', 'https://www.afd.fr/en/calls-for-proposals', 'afd.fr', 'bilateral_donor', 2),
  ('EU TED', 'https://ted.europa.eu', 'ted.europa.eu', 'bilateral_donor', 2),
  -- NEW: African government portals
  ('Kenya tenders.go.ke', 'https://tenders.go.ke', 'tenders.go.ke', 'african_government', 2),
  ('Nigeria NOCOPO', 'https://nocopo.bpp.gov.ng', 'nocopo.bpp.gov.ng', 'african_government', 2),
  ('Rwanda Umucyo', 'https://www.umucyo.gov.rw', 'umucyo.gov.rw', 'african_government', 2),
  ('Ethiopia PPA', 'https://www.ppa.gov.et', 'ppa.gov.et', 'african_government', 2),
  ('Tanzania TANePS', 'https://www.tanepsnet.go.tz', 'tanepsnet.go.tz', 'african_government', 2),
  ('Uganda EGP', 'https://egpuganda.go.ug', 'egpuganda.go.ug', 'african_government', 2)
ON CONFLICT (name) DO NOTHING;

-- Backfill scraped_rfps category/priority from scrape_sources by matching portal name
UPDATE public.scraped_rfps r
SET source_category = s.category,
    source_priority = s.priority
FROM public.scrape_sources s
WHERE r.portal = s.name
  AND r.source_category IS NULL;
