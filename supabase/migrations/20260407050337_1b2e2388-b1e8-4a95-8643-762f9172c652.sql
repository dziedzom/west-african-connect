
-- Add Bid Studio usage tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS rfps_analysed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bids_generated integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bids_reviewed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS checklists_created integer DEFAULT 0;

-- Create bid_drafts table
CREATE TABLE public.bid_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_id uuid REFERENCES public.scraped_rfps(id) ON DELETE SET NULL,
  rfp_title text,
  company_intake jsonb,
  generated_sections jsonb,
  status text DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Validate status values via trigger
CREATE OR REPLACE FUNCTION public.validate_bid_draft_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'submitted', 'won', 'lost') THEN
    RAISE EXCEPTION 'status must be draft, submitted, won, or lost';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_bid_draft_status_trigger
BEFORE INSERT OR UPDATE ON public.bid_drafts
FOR EACH ROW EXECUTE FUNCTION public.validate_bid_draft_status();

CREATE TRIGGER update_bid_drafts_updated_at
BEFORE UPDATE ON public.bid_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bid_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid drafts" ON public.bid_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bid drafts" ON public.bid_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bid drafts" ON public.bid_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bid drafts" ON public.bid_drafts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bid drafts" ON public.bid_drafts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create bid_reviews table
CREATE TABLE public.bid_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_title text,
  overall_score integer,
  grade text,
  review_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bid_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bid reviews" ON public.bid_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bid reviews" ON public.bid_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bid reviews" ON public.bid_reviews FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
