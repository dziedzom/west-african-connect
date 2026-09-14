-- Repoint relationships from the legacy table to the live one (both dependent tables are empty)
ALTER TABLE public.ai_insights DROP CONSTRAINT IF EXISTS ai_insights_rfp_id_fkey;
ALTER TABLE public.ai_insights
  ADD CONSTRAINT ai_insights_rfp_id_fkey
  FOREIGN KEY (rfp_id) REFERENCES public.scraped_rfps(id) ON DELETE CASCADE;

ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_rfp_id_fkey;
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_rfp_id_fkey
  FOREIGN KEY (rfp_id) REFERENCES public.scraped_rfps(id) ON DELETE SET NULL;

-- Deprecate (do not delete) the legacy table
ALTER TABLE public.rfps RENAME TO rfps_deprecated_20260914;

REVOKE ALL ON public.rfps_deprecated_20260914 FROM anon;
REVOKE ALL ON public.rfps_deprecated_20260914 FROM authenticated;
GRANT ALL ON public.rfps_deprecated_20260914 TO service_role;

ALTER TABLE public.rfps_deprecated_20260914 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RFPs are viewable by everyone" ON public.rfps_deprecated_20260914;

CREATE POLICY "Deprecated table: admins only"
ON public.rfps_deprecated_20260914
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.rfps_deprecated_20260914 IS
  'DEPRECATED 2026-09-14. Superseded by public.scraped_rfps. Retained for rollback only; nothing reads from it.';