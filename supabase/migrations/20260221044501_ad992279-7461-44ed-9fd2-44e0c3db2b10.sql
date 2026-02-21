
-- Create category enum for partnership services
CREATE TYPE public.partnership_category AS ENUM (
  'marketing_advertising',
  'communication',
  'production',
  'web_digital'
);

-- Partnership RFPs table (curated listings for partner collaboration)
CREATE TABLE public.partnership_rfps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category partnership_category NOT NULL,
  budget_range TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  location TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partnership applications table
CREATE TABLE public.partnership_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES public.partnership_rfps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  proposal TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  portfolio_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_applications ENABLE ROW LEVEL SECURITY;

-- RFPs are publicly readable (open listings)
CREATE POLICY "Anyone can view open partnership RFPs"
  ON public.partnership_rfps FOR SELECT
  USING (status = 'open');

-- Authenticated users can apply
CREATE POLICY "Authenticated users can create applications"
  ON public.partnership_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON public.partnership_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Timestamp triggers
CREATE TRIGGER update_partnership_rfps_updated_at
  BEFORE UPDATE ON public.partnership_rfps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partnership_applications_updated_at
  BEFORE UPDATE ON public.partnership_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
