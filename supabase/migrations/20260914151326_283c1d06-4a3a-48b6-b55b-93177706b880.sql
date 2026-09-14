REVOKE ALL ON FUNCTION public.protect_verification_review_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_verification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_verification_transition() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_verification_review_fields() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_verification() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_verification_transition() TO service_role;
