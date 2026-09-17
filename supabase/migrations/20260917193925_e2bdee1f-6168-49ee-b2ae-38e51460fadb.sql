DROP POLICY "Owners edit own draft verification" ON public.company_verifications;
CREATE POLICY "Owners edit own draft verification"
ON public.company_verifications
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['unverified'::verification_status, 'rejected'::verification_status])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = ANY (ARRAY['unverified'::verification_status, 'rejected'::verification_status])
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND review_notes IS NULL
  AND verified_until IS NULL
);

DROP POLICY "Owners create own verification" ON public.company_verifications;
CREATE POLICY "Owners create own verification"
ON public.company_verifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'unverified'::verification_status
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND review_notes IS NULL
  AND verified_until IS NULL
  AND submitted_at IS NULL
);