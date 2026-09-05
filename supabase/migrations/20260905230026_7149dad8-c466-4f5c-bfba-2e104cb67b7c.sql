-- 1. Review flag for scraped listings (never deleted, just flagged)
ALTER TABLE public.scraped_rfps
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_scraped_rfps_deadline ON public.scraped_rfps (deadline);
CREATE INDEX IF NOT EXISTS idx_rfps_deadline_status ON public.rfps (status, deadline);

-- 2. Public read policies: deadline-aware
DROP POLICY IF EXISTS "Anyone can view scraped RFPs" ON public.scraped_rfps;
CREATE POLICY "Public sees live scraped RFPs, admins see all"
ON public.scraped_rfps
FOR SELECT
USING (
  (deadline IS NOT NULL AND deadline >= now())
  OR CASE WHEN auth.uid() IS NULL THEN false
          ELSE public.has_role(auth.uid(), 'admin') END
);

DROP POLICY IF EXISTS "Anyone can view open rfps" ON public.rfps;
CREATE POLICY "Anyone can view open, unexpired rfps"
ON public.rfps
FOR SELECT
USING (status = 'open' AND (deadline IS NULL OR deadline >= now()));

-- 3. Daily expiry job (idempotent, bounded)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('expire-listings-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-listings-daily');

SELECT cron.schedule(
  'expire-listings-daily',
  '30 5 * * *',
  $$
  UPDATE public.rfps
     SET status = 'expired'
   WHERE status = 'open' AND deadline IS NOT NULL AND deadline < now();

  UPDATE public.scraped_rfps
     SET status = 'expired'
   WHERE status <> 'expired' AND deadline IS NOT NULL AND deadline < now();

  UPDATE public.scraped_rfps
     SET needs_review = true
   WHERE deadline IS NULL AND needs_review = false;
  $$
);