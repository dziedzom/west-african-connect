ALTER TABLE public.scrape_sources
  ADD COLUMN IF NOT EXISTS follow_detail_pages boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_link_pattern text,
  ADD COLUMN IF NOT EXISTS detail_max_per_run integer NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.scrape_sources.follow_detail_pages IS 'When true, listing items without a deadline get their detail page fetched and re-extracted.';
COMMENT ON COLUMN public.scrape_sources.detail_link_pattern IS 'Optional regex (case-insensitive) a candidate detail URL must match, e.g. /procurement/notice|/tender/.';
COMMENT ON COLUMN public.scrape_sources.detail_max_per_run IS 'Cap on detail-page fetches per source per run.';

UPDATE public.scrape_sources
SET follow_detail_pages = true,
    detail_max_per_run = 6,
    detail_link_pattern = '/procurement|/notice|/opportunit|/tender|/bid|/contract'
WHERE name ILIKE '%World Bank%';

UPDATE public.scrape_sources
SET follow_detail_pages = true,
    detail_max_per_run = 6,
    detail_link_pattern = '/procurement|/notice|/tender|/bid|/invitation|/expression|/eoi'
WHERE name ILIKE '%ECOWAS%';