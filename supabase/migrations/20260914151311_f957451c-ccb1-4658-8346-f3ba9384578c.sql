-- 1. Enums
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected', 'expired');
CREATE TYPE public.verification_doc_type AS ENUM ('certificate_of_incorporation', 'tax_clearance', 'business_licence', 'vat_or_tin', 'bank_letter', 'other');

-- 2. company_verifications
CREATE TABLE public.company_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legal_name TEXT,
  registration_number TEXT,
  registration_country TEXT,
  year_founded INTEGER,
  status public.verification_status NOT NULL DEFAULT 'unverified',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_notes TEXT,
  rejection_reason TEXT,
  verified_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_verifications_user ON public.company_verifications(user_id);
CREATE INDEX idx_company_verifications_status ON public.company_verifications(status, submitted_at);

GRANT SELECT, INSERT, UPDATE ON public.company_verifications TO authenticated;
GRANT ALL ON public.company_verifications TO service_role;
ALTER TABLE public.company_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own verifications" ON public.company_verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all verifications" ON public.company_verifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create own verification" ON public.company_verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners edit own draft verification" ON public.company_verifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('unverified', 'rejected'))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update verifications" ON public.company_verifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. documents
CREATE TABLE public.company_verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL REFERENCES public.company_verifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  doc_type public.verification_doc_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_docs_verification ON public.company_verification_documents(verification_id);

GRANT SELECT, INSERT, DELETE ON public.company_verification_documents TO authenticated;
GRANT ALL ON public.company_verification_documents TO service_role;
ALTER TABLE public.company_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own verification documents" ON public.company_verification_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all verification documents" ON public.company_verification_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners add own verification documents" ON public.company_verification_documents
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.company_verifications v
      WHERE v.id = verification_id AND v.user_id = auth.uid()
        AND v.status IN ('unverified', 'rejected')
    )
  );
CREATE POLICY "Owners remove own pre-review documents" ON public.company_verification_documents
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.company_verifications v
      WHERE v.id = verification_id AND v.user_id = auth.uid()
        AND v.status IN ('unverified', 'rejected')
    )
  );

-- 4. profiles mirror columns
ALTER TABLE public.profiles
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN verified_at TIMESTAMPTZ;

-- 5. updated_at trigger
CREATE TRIGGER update_company_verifications_updated_at
  BEFORE UPDATE ON public.company_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. status transition validation
CREATE OR REPLACE FUNCTION public.validate_verification_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'unverified' AND NEW.status = 'pending') OR
    (OLD.status = 'rejected'   AND NEW.status = 'pending') OR
    (OLD.status = 'expired'    AND NEW.status = 'pending') OR
    (OLD.status = 'pending'    AND NEW.status IN ('verified', 'rejected')) OR
    (OLD.status = 'verified'   AND NEW.status = 'expired')
  ) THEN
    RAISE EXCEPTION 'Invalid verification status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_verification_transition_trg
  BEFORE UPDATE ON public.company_verifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_verification_transition();

-- 7. block client writes to review/decision fields
CREATE OR REPLACE FUNCTION public.protect_verification_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.verified_until IS DISTINCT FROM OLD.verified_until
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
  THEN
    RAISE EXCEPTION 'Verification status and review fields can only be modified server-side';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_verification_review_fields() FROM authenticated, anon;
CREATE TRIGGER protect_verification_review_fields_trg
  BEFORE UPDATE ON public.company_verifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_verification_review_fields();

-- 8. mirror status onto profiles
CREATE OR REPLACE FUNCTION public.sync_profile_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET verification_status = NEW.status,
         verified_at = CASE WHEN NEW.status = 'verified' THEN COALESCE(NEW.reviewed_at, now()) ELSE verified_at END
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_profile_verification() FROM authenticated, anon;
CREATE TRIGGER sync_profile_verification_trg
  AFTER INSERT OR UPDATE OF status ON public.company_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification();

-- 9. extend profile privileged-field protection to the mirrored columns
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
     OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
     OR NEW.subscription_amount IS DISTINCT FROM OLD.subscription_amount
     OR NEW.rfps_analysed IS DISTINCT FROM OLD.rfps_analysed
     OR NEW.bids_generated IS DISTINCT FROM OLD.bids_generated
     OR NEW.bids_reviewed IS DISTINCT FROM OLD.bids_reviewed
     OR NEW.checklists_created IS DISTINCT FROM OLD.checklists_created
     OR NEW.insights_generated IS DISTINCT FROM OLD.insights_generated
     OR NEW.proposals_drafted IS DISTINCT FROM OLD.proposals_drafted
     OR NEW.usage_period_start IS DISTINCT FROM OLD.usage_period_start
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
  THEN
    RAISE EXCEPTION 'Subscription, usage and verification fields can only be modified server-side';
  END IF;
  RETURN NEW;
END;
$function$;
