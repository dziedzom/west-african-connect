
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, subscription_tier, subscription_plan, subscription_start, subscription_end)
  VALUES (
    NEW.id,
    NEW.email,
    'pro',
    'monthly',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$;
