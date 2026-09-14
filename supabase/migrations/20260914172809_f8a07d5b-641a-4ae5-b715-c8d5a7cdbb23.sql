DROP TRIGGER IF EXISTS compute_success_fee_trg ON public.won_contracts;
DROP FUNCTION IF EXISTS public.compute_success_fee();

CREATE OR REPLACE FUNCTION public.flag_contract_fx_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_value IS NULL OR NEW.contract_value <= 0 THEN
    RAISE EXCEPTION 'contract_value must be positive';
  END IF;
  NEW.needs_fx_review = COALESCE(NEW.currency, 'USD') <> 'USD';
  RETURN NEW;
END;
$$;

CREATE TRIGGER flag_contract_fx_review_trg
  BEFORE INSERT OR UPDATE OF contract_value, currency ON public.won_contracts
  FOR EACH ROW EXECUTE FUNCTION public.flag_contract_fx_review();