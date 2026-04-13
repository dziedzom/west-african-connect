
-- 1. Prevent multiple admins via race condition
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin ON public.user_roles (role) WHERE role = 'admin';

-- 2. Auto-assign admin to the first user
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_first_admin_assignment
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_admin();

-- 3. Seed admin for existing user if they exist
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'
FROM public.profiles p
WHERE p.email = 'dziedzomnunekpeku@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ON CONFLICT DO NOTHING;
