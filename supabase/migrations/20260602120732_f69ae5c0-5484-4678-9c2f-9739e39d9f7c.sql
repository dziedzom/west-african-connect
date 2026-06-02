
-- 1. Lock down SECURITY DEFINER functions: revoke from public/anon, grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_bid_draft_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_profile_subscription() FROM PUBLIC, anon;

-- 2. Admin DELETE/UPDATE on contact_messages
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact messages"
ON public.contact_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Admin DELETE/UPDATE on newsletter_subscribers
CREATE POLICY "Admins can update newsletter subscribers"
ON public.newsletter_subscribers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete newsletter subscribers"
ON public.newsletter_subscribers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Prevent profile subscription/usage tampering via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  THEN
    RAISE EXCEPTION 'Subscription and usage counter fields can only be modified server-side';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_privileged_updates() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_profile_privileged_updates_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privileged_updates_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privileged_updates();
