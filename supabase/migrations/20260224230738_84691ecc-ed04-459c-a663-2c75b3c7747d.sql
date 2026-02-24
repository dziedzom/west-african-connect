
-- =============================================================
-- 1. RFPs table (public listing of opportunities)
-- =============================================================
CREATE TABLE public.rfps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  org TEXT,
  location TEXT,
  budget TEXT,
  value TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rfps ENABLE ROW LEVEL SECURITY;

-- Anyone can view open RFPs
CREATE POLICY "Anyone can view open rfps"
  ON public.rfps FOR SELECT
  USING (status = 'open');

-- Trigger for updated_at
CREATE TRIGGER update_rfps_updated_at
  BEFORE UPDATE ON public.rfps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- 2. Contact Messages table
-- =============================================================
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (contact form is public)
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- =============================================================
-- 3. Newsletter Subscribers table
-- =============================================================
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);
