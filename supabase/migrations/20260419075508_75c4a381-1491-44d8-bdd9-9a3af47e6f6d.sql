ALTER TABLE public.ai_insights 
  ADD COLUMN IF NOT EXISTS key_requirements jsonb,
  ADD COLUMN IF NOT EXISTS risk_flags jsonb,
  ADD COLUMN IF NOT EXISTS missing_qualifications jsonb;