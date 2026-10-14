ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS deadline_source text,
  ADD COLUMN IF NOT EXISTS value_source text,
  ADD COLUMN IF NOT EXISTS organization_source text,
  ADD COLUMN IF NOT EXISTS reread_reason text;
COMMENT ON COLUMN public.scraped_rfps.deadline_source IS 'scrape | detail_page | deep_read; null = recorded before tracking began (2026-10-14)';
COMMENT ON COLUMN public.scraped_rfps.value_source IS 'deep_read; null = no value or recorded before tracking';
COMMENT ON COLUMN public.scraped_rfps.organization_source IS 'scrape | deep_read; null = recorded before tracking';
COMMENT ON COLUMN public.scraped_rfps.reread_reason IS 'Set when a row is queued for a corrective document re-read (value | deadline); cleared after the re-read.';
CREATE INDEX IF NOT EXISTS idx_scraped_rfps_reread ON public.scraped_rfps (reread_reason) WHERE reread_reason IS NOT NULL;
UPDATE public.scraped_rfps SET value_source = 'deep_read' WHERE value_amount IS NOT NULL AND value_evidence IS NOT NULL;