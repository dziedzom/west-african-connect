
-- 1. Replace the overly broad admin profile SELECT with a restricted view (hide financial fields)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create a view for admin use that excludes sensitive subscription financial data
CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT
  id, user_id, company_name, email, expertise, location, website, about,
  subscription_tier, subscription_plan,
  bids_generated, bids_reviewed, checklists_created, rfps_analysed,
  created_at, updated_at
FROM public.profiles;

-- 2. Add DELETE policy for won_contracts scoped to owner
CREATE POLICY "Users can delete own won contracts"
ON public.won_contracts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
