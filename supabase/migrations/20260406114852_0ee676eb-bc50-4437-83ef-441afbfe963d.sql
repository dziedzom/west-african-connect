
-- Add subscription columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan text,
ADD COLUMN IF NOT EXISTS subscription_start date,
ADD COLUMN IF NOT EXISTS subscription_end date,
ADD COLUMN IF NOT EXISTS subscription_amount numeric;

-- Add validation trigger for subscription_tier
CREATE OR REPLACE FUNCTION public.validate_profile_subscription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_tier NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'subscription_tier must be free or pro';
  END IF;
  IF NEW.subscription_plan IS NOT NULL AND NEW.subscription_plan NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'subscription_plan must be monthly or annual';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_subscription_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_subscription();

-- Create won_contracts table
CREATE TABLE public.won_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rfp_id uuid,
  rfp_title text NOT NULL,
  contract_value numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  success_fee numeric GENERATED ALWAYS AS (LEAST(ROUND(contract_value * 0.035, 2), 5000)) STORED,
  agreement_confirmed boolean NOT NULL DEFAULT false,
  invoice_sent boolean NOT NULL DEFAULT false,
  invoice_sent_at timestamp with time zone,
  fee_paid boolean NOT NULL DEFAULT false,
  fee_paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.won_contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for won_contracts
CREATE POLICY "Users can view own won contracts"
ON public.won_contracts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own won contracts"
ON public.won_contracts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own won contracts"
ON public.won_contracts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all won contracts"
ON public.won_contracts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all won contracts"
ON public.won_contracts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_won_contracts_updated_at
BEFORE UPDATE ON public.won_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
