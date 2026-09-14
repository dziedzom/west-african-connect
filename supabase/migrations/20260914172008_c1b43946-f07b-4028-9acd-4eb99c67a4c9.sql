CREATE TABLE public.opportunity_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_id uuid NOT NULL REFERENCES public.scraped_rfps(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'interested',
  predicted_match_score numeric,
  predicted_match_at timestamptz,
  insight_id uuid,
  predicted_win_probability numeric,
  predicted_win_confidence text,
  predicted_review_score integer,
  predicted_review_grade text,
  review_id uuid,
  prediction_snapshot_at timestamptz,
  outcome_reported_at timestamptz,
  outcome_source text,
  outcome_note text,
  contract_value numeric,
  contract_currency text,
  nudge_count integer NOT NULL DEFAULT 0,
  last_nudge_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rfp_id)
);

CREATE INDEX idx_opportunity_tracker_user ON public.opportunity_tracker(user_id);
CREATE INDEX idx_opportunity_tracker_rfp ON public.opportunity_tracker(rfp_id);
CREATE INDEX idx_opportunity_tracker_status ON public.opportunity_tracker(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_tracker TO authenticated;
GRANT ALL ON public.opportunity_tracker TO service_role;

ALTER TABLE public.opportunity_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracker rows"
  ON public.opportunity_tracker FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tracker rows"
  ON public.opportunity_tracker FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own tracker rows"
  ON public.opportunity_tracker FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracker rows"
  ON public.opportunity_tracker FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracker rows"
  ON public.opportunity_tracker FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_tracker_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('interested','preparing','submitted','won','lost','no_decision_yet','not_pursued') THEN
    RAISE EXCEPTION 'invalid tracker status: %', NEW.status;
  END IF;

  IF NEW.status = 'won' AND (NEW.contract_value IS NULL OR NEW.contract_value <= 0) THEN
    RAISE EXCEPTION 'a won outcome requires a positive contract value';
  END IF;

  IF NEW.status IN ('won','lost','no_decision_yet','not_pursued') AND NEW.outcome_reported_at IS NULL THEN
    NEW.outcome_reported_at = now();
  END IF;

  IF NEW.status IN ('interested','preparing','submitted') THEN
    NEW.outcome_reported_at = NULL;
    NEW.outcome_source = NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tracker_status_trg
  BEFORE INSERT OR UPDATE ON public.opportunity_tracker
  FOR EACH ROW EXECUTE FUNCTION public.validate_tracker_status();

CREATE TRIGGER update_opportunity_tracker_updated_at
  BEFORE UPDATE ON public.opportunity_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.won_contracts
  ADD COLUMN tracker_id uuid REFERENCES public.opportunity_tracker(id) ON DELETE SET NULL,
  ADD COLUMN needs_fx_review boolean NOT NULL DEFAULT false;