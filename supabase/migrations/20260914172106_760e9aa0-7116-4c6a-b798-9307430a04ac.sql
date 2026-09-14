CREATE OR REPLACE FUNCTION public.compute_success_fee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_value IS NULL OR NEW.contract_value <= 0 THEN
    RAISE EXCEPTION 'contract_value must be positive';
  END IF;

  NEW.success_fee = LEAST(ROUND(NEW.contract_value * 0.035, 2), 5000);
  NEW.needs_fx_review = COALESCE(NEW.currency, 'USD') <> 'USD';
  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_success_fee_trg
  BEFORE INSERT OR UPDATE OF contract_value, currency ON public.won_contracts
  FOR EACH ROW EXECUTE FUNCTION public.compute_success_fee();