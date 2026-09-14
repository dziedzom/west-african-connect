-- 1. Saved RFP analyses
CREATE TABLE public.bid_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL,
  title text NOT NULL,
  source_text text,
  analysis_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bid_analyses TO authenticated;
GRANT ALL ON public.bid_analyses TO service_role;
ALTER TABLE public.bid_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses" ON public.bid_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own analyses" ON public.bid_analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own analyses" ON public.bid_analyses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analyses" ON public.bid_analyses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all analyses" ON public.bid_analyses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bid_analyses_user_created ON public.bid_analyses (user_id, created_at DESC);

CREATE TRIGGER update_bid_analyses_updated_at
  BEFORE UPDATE ON public.bid_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Saved submission checklists
CREATE TABLE public.submission_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL,
  title text NOT NULL,
  deadline date,
  country text,
  documents text,
  checklist_data jsonb NOT NULL,
  checked_items jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_checklists TO authenticated;
GRANT ALL ON public.submission_checklists TO service_role;
ALTER TABLE public.submission_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklists" ON public.submission_checklists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own checklists" ON public.submission_checklists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own checklists" ON public.submission_checklists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own checklists" ON public.submission_checklists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all checklists" ON public.submission_checklists
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_submission_checklists_user_created ON public.submission_checklists (user_id, created_at DESC);

CREATE TRIGGER update_submission_checklists_updated_at
  BEFORE UPDATE ON public.submission_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Link bid reviews to a live opportunity
ALTER TABLE public.bid_reviews
  ADD COLUMN rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL;

CREATE INDEX idx_bid_reviews_rfp ON public.bid_reviews (rfp_id);

-- 4. One AI insight per user per opportunity
DELETE FROM public.ai_insights a
USING public.ai_insights b
WHERE a.user_id = b.user_id
  AND a.rfp_id = b.rfp_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX ai_insights_user_rfp_unique
  ON public.ai_insights (user_id, rfp_id);