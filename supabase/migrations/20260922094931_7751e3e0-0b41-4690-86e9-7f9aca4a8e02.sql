ALTER TABLE public.scrape_sources ADD COLUMN IF NOT EXISTS scrape_actions jsonb;

COMMENT ON COLUMN public.scrape_sources.scrape_actions IS 'Optional browser actions run before the page is read, for portals whose default view is not the newest notices.';

UPDATE public.scrape_sources
SET scrape_actions = '[
  {"type":"wait","milliseconds":6000},
  {"type":"click","selector":"#id_DatePublished"},
  {"type":"wait","milliseconds":3500},
  {"type":"click","selector":"#id_DatePublished"},
  {"type":"wait","milliseconds":3500},
  {"type":"scroll","direction":"down"},
  {"type":"wait","milliseconds":2500},
  {"type":"scroll","direction":"down"},
  {"type":"wait","milliseconds":2500},
  {"type":"scroll","direction":"down"},
  {"type":"wait","milliseconds":2500}
]'::jsonb,
    notes = coalesce(notes || ' | ', '') || 'Read newest-published-first: the default view lists only the 15 notices closing soonest, so notices arrived on their deadline day.'
WHERE domain ilike '%ungm%';

UPDATE public.scraped_rfps
SET location = 'Mauritius', organization = 'UNDP'
WHERE source_url = 'https://www.ungm.org/Public/Notice/312536';