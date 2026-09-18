DROP POLICY IF EXISTS "Public sees live scraped RFPs, admins see all" ON public.scraped_rfps;

CREATE POLICY "Anyone can view live scraped RFPs"
ON public.scraped_rfps
FOR SELECT
USING (
  africa_relevant = true
  AND status = ANY (ARRAY['open'::text, 'closing_soon'::text])
  AND deadline IS NOT NULL
  AND deadline >= now()
);

CREATE POLICY "Admins can view all scraped RFPs"
ON public.scraped_rfps
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_engagement_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_engagement_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_engagement_client(uuid) TO authenticated, service_role;