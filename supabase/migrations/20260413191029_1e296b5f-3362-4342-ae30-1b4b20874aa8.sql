
DROP VIEW IF EXISTS public.admin_profiles_view;

CREATE VIEW public.admin_profiles_view
WITH (security_invoker = true) AS
SELECT
  id, user_id, company_name, email, expertise, location, website, about,
  subscription_tier, subscription_plan,
  bids_generated, bids_reviewed, checklists_created, rfps_analysed,
  created_at, updated_at
FROM public.profiles;
