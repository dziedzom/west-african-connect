-- ============ helper enums via text + validation triggers (matching existing patterns) ============

CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  sector text,
  capabilities text,
  location text,
  contact_name text,
  contact_email text,
  contact_phone text,
  lead_source text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  converted_user_id uuid,
  converted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prospects" ON public.prospects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  client_user_id uuid,
  rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL,
  manual_title text,
  manual_buyer text,
  manual_deadline timestamptz,
  manual_source_url text,
  stage text NOT NULL DEFAULT 'identified',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engagement_has_one_company CHECK (
    (prospect_id IS NOT NULL AND client_user_id IS NULL)
    OR (prospect_id IS NULL AND client_user_id IS NOT NULL)
    OR (prospect_id IS NOT NULL AND client_user_id IS NOT NULL)
  ),
  CONSTRAINT engagement_has_company CHECK (prospect_id IS NOT NULL OR client_user_id IS NOT NULL),
  CONSTRAINT engagement_has_opportunity CHECK (rfp_id IS NOT NULL OR manual_title IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagements TO authenticated;
GRANT ALL ON public.engagements TO service_role;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage engagements" ON public.engagements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own engagements" ON public.engagements FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());
CREATE INDEX idx_engagements_stage ON public.engagements(stage);
CREATE INDEX idx_engagements_prospect ON public.engagements(prospect_id);
CREATE INDEX idx_engagements_client ON public.engagements(client_user_id);

-- security definer helper: is the caller the client on this engagement?
CREATE OR REPLACE FUNCTION public.is_engagement_client(_engagement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.engagements
    WHERE id = _engagement_id AND client_user_id = auth.uid()
  )
$$;

CREATE TABLE public.engagement_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  is_internal boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_activities TO authenticated;
GRANT ALL ON public.engagement_activities TO service_role;
ALTER TABLE public.engagement_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage engagement activities" ON public.engagement_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view shared activities" ON public.engagement_activities FOR SELECT TO authenticated
  USING (is_internal = false AND public.is_engagement_client(engagement_id));
CREATE INDEX idx_engagement_activities_engagement ON public.engagement_activities(engagement_id);

CREATE TABLE public.engagement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text,
  provided_by text NOT NULL DEFAULT 'company',
  status text NOT NULL DEFAULT 'required',
  due_date date,
  notes text,
  storage_path text,
  external_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_documents TO authenticated;
GRANT ALL ON public.engagement_documents TO service_role;
ALTER TABLE public.engagement_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage engagement documents" ON public.engagement_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own engagement documents" ON public.engagement_documents FOR SELECT TO authenticated
  USING (public.is_engagement_client(engagement_id));
CREATE INDEX idx_engagement_documents_engagement ON public.engagement_documents(engagement_id);

CREATE TABLE public.engagement_partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  lead_prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  lead_user_id uuid,
  lead_label text,
  lead_status text NOT NULL DEFAULT 'proposed',
  partner_prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  partner_user_id uuid,
  partner_label text,
  partner_status text NOT NULL DEFAULT 'proposed',
  rationale text,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_partnerships TO authenticated;
GRANT ALL ON public.engagement_partnerships TO service_role;
ALTER TABLE public.engagement_partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage engagement partnerships" ON public.engagement_partnerships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.engagement_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL UNIQUE REFERENCES public.engagements(id) ON DELETE CASCADE,
  project_value numeric,
  currency text NOT NULL DEFAULT 'USD',
  commission_rate numeric NOT NULL DEFAULT 20,
  expected_commission numeric GENERATED ALWAYS AS (
    CASE WHEN project_value IS NULL THEN NULL
         ELSE round(project_value * commission_rate / 100.0, 2) END
  ) STORED,
  needs_fx_review boolean GENERATED ALWAYS AS (currency <> 'USD') STORED,
  status text NOT NULL DEFAULT 'projected',
  agreed_at timestamptz,
  invoiced_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_commissions TO authenticated;
GRANT ALL ON public.engagement_commissions TO service_role;
ALTER TABLE public.engagement_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage engagement commissions" ON public.engagement_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ validation triggers ============
CREATE OR REPLACE FUNCTION public.validate_engagement_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage NOT IN ('identified','documents_assembling','bid_drafting','offer_made','terms_agreed','submitted','shortlisted','won','lost') THEN
    RAISE EXCEPTION 'invalid engagement stage: %', NEW.stage;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_engagement_stage_trg BEFORE INSERT OR UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.validate_engagement_stage();

CREATE OR REPLACE FUNCTION public.validate_engagement_document()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('required','requested','received','verified','signed','submitted','not_applicable') THEN
    RAISE EXCEPTION 'invalid document status: %', NEW.status;
  END IF;
  IF NEW.provided_by NOT IN ('admin','company') THEN
    RAISE EXCEPTION 'invalid provided_by: %', NEW.provided_by;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_engagement_document_trg BEFORE INSERT OR UPDATE ON public.engagement_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_engagement_document();

CREATE OR REPLACE FUNCTION public.validate_engagement_commission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('projected','agreed','invoiced','paid','written_off') THEN
    RAISE EXCEPTION 'invalid commission status: %', NEW.status;
  END IF;
  IF NEW.commission_rate < 0 OR NEW.commission_rate > 100 THEN
    RAISE EXCEPTION 'commission_rate must be between 0 and 100';
  END IF;
  IF NEW.project_value IS NOT NULL AND NEW.project_value < 0 THEN
    RAISE EXCEPTION 'project_value must be positive';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_engagement_commission_trg BEFORE INSERT OR UPDATE ON public.engagement_commissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_engagement_commission();

CREATE OR REPLACE FUNCTION public.validate_prospect_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('new','contacted','interested','engaged','converted','dormant') THEN
    RAISE EXCEPTION 'invalid prospect status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_prospect_status_trg BEFORE INSERT OR UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.validate_prospect_status();

CREATE OR REPLACE FUNCTION public.validate_partnership_side_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.lead_status NOT IN ('proposed','approached','accepted','declined')
     OR NEW.partner_status NOT IN ('proposed','approached','accepted','declined') THEN
    RAISE EXCEPTION 'invalid pairing side status';
  END IF;
  IF NEW.status NOT IN ('proposed','in_discussion','agreed','abandoned') THEN
    RAISE EXCEPTION 'invalid pairing status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_partnership_side_status_trg BEFORE INSERT OR UPDATE ON public.engagement_partnerships
  FOR EACH ROW EXECUTE FUNCTION public.validate_partnership_side_status();

-- updated_at triggers
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_documents_updated_at BEFORE UPDATE ON public.engagement_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_partnerships_updated_at BEFORE UPDATE ON public.engagement_partnerships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_commissions_updated_at BEFORE UPDATE ON public.engagement_commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Bid Studio attribution ============
ALTER TABLE public.bid_analyses ADD COLUMN engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL;
ALTER TABLE public.bid_drafts ADD COLUMN engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL;
ALTER TABLE public.bid_reviews ADD COLUMN engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL;
ALTER TABLE public.submission_checklists ADD COLUMN engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL;

CREATE INDEX idx_bid_analyses_engagement ON public.bid_analyses(engagement_id);
CREATE INDEX idx_bid_drafts_engagement ON public.bid_drafts(engagement_id);
CREATE INDEX idx_bid_reviews_engagement ON public.bid_reviews(engagement_id);
CREATE INDEX idx_submission_checklists_engagement ON public.submission_checklists(engagement_id);

CREATE POLICY "Clients view engagement analyses" ON public.bid_analyses FOR SELECT TO authenticated
  USING (engagement_id IS NOT NULL AND public.is_engagement_client(engagement_id));
CREATE POLICY "Clients view engagement drafts" ON public.bid_drafts FOR SELECT TO authenticated
  USING (engagement_id IS NOT NULL AND public.is_engagement_client(engagement_id));
CREATE POLICY "Clients view engagement reviews" ON public.bid_reviews FOR SELECT TO authenticated
  USING (engagement_id IS NOT NULL AND public.is_engagement_client(engagement_id));
CREATE POLICY "Clients view engagement checklists" ON public.submission_checklists FOR SELECT TO authenticated
  USING (engagement_id IS NOT NULL AND public.is_engagement_client(engagement_id));