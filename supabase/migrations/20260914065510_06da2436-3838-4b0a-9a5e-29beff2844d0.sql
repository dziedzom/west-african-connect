DROP POLICY IF EXISTS "Public sees live scraped RFPs, admins see all" ON public.scraped_rfps;

CREATE POLICY "Public sees live scraped RFPs, admins see all"
ON public.scraped_rfps
FOR SELECT
USING (
  (
    africa_relevant = true
    AND status = ANY (ARRAY['open'::text, 'closing_soon'::text])
    AND deadline IS NOT NULL
    AND deadline >= now()
  )
  OR CASE WHEN auth.uid() IS NULL THEN false ELSE public.has_role(auth.uid(), 'admin'::app_role) END
);