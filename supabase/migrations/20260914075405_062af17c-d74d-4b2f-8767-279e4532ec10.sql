ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS usage_period_start date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS insights_generated integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposals_drafted integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role (edge functions with service key) to update anything
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block client-side changes to privileged fields
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
     OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end
     OR NEW.subscription_amount IS DISTINCT FROM OLD.subscription_amount
     OR NEW.rfps_analysed IS DISTINCT FROM OLD.rfps_analysed
     OR NEW.bids_generated IS DISTINCT FROM OLD.bids_generated
     OR NEW.bids_reviewed IS DISTINCT FROM OLD.bids_reviewed
     OR NEW.checklists_created IS DISTINCT FROM OLD.checklists_created
     OR NEW.insights_generated IS DISTINCT FROM OLD.insights_generated
     OR NEW.proposals_drafted IS DISTINCT FROM OLD.proposals_drafted
     OR NEW.usage_period_start IS DISTINCT FROM OLD.usage_period_start
  THEN
    RAISE EXCEPTION 'Subscription and usage counter fields can only be modified server-side';
  END IF;
  RETURN NEW;
END;
$function$;