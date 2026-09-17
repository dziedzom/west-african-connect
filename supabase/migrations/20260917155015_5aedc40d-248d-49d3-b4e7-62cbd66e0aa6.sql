ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS is_award_notice boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_source text;

CREATE INDEX IF NOT EXISTS idx_scraped_rfps_award_notice
  ON public.scraped_rfps (is_award_notice)
  WHERE is_award_notice = true;