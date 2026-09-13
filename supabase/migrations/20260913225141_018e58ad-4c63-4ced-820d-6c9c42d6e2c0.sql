-- Public read: open + closing_soon rows with a future deadline; admins see all.
DROP POLICY IF EXISTS "Public sees live scraped RFPs, admins see all" ON public.scraped_rfps;

CREATE POLICY "Public sees live scraped RFPs, admins see all"
ON public.scraped_rfps
FOR SELECT
USING (
  (
    status IN ('open', 'closing_soon')
    AND deadline IS NOT NULL
    AND deadline >= now()
  )
  OR CASE WHEN auth.uid() IS NULL THEN false ELSE public.has_role(auth.uid(), 'admin') END
);

-- Backfill statuses under the new model.
UPDATE public.scraped_rfps
   SET status = 'expired'
 WHERE status <> 'expired' AND deadline IS NOT NULL AND deadline < now();

UPDATE public.scraped_rfps
   SET status = 'closing_soon'
 WHERE status = 'open' AND deadline IS NOT NULL
   AND deadline >= now() AND deadline < now() + interval '7 days';

-- Daily maintenance job: expire past-deadline rows, promote near-deadline rows, flag null deadlines.
SELECT cron.unschedule('expire-listings-daily');

SELECT cron.schedule('expire-listings-daily', '30 5 * * *', $job$
  UPDATE public.rfps
     SET status = 'expired'
   WHERE status = 'open' AND deadline IS NOT NULL AND deadline < now();

  UPDATE public.scraped_rfps
     SET status = 'expired'
   WHERE status <> 'expired' AND deadline IS NOT NULL AND deadline < now();

  UPDATE public.scraped_rfps
     SET status = 'closing_soon'
   WHERE status = 'open' AND deadline IS NOT NULL
     AND deadline >= now() AND deadline < now() + interval '7 days';

  UPDATE public.scraped_rfps
     SET needs_review = true
   WHERE deadline IS NULL AND needs_review = false;
$job$);