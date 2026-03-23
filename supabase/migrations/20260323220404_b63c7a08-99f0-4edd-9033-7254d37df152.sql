
CREATE TABLE public.scraped_rfps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  category TEXT,
  budget TEXT,
  location TEXT,
  organization TEXT,
  source_url TEXT NOT NULL,
  portal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scraped_rfps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scraped RFPs"
  ON public.scraped_rfps
  FOR SELECT
  TO public
  USING (true);

CREATE UNIQUE INDEX scraped_rfps_source_url_idx ON public.scraped_rfps (source_url);
