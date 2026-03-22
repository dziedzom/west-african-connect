CREATE TABLE public.rfp_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfp_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rfp opportunities"
  ON public.rfp_opportunities
  FOR SELECT
  TO public
  USING (true);