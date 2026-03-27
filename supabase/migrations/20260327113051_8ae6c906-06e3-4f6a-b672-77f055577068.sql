
-- CRITICAL: Prevent privilege escalation on user_roles
-- Only admins can INSERT roles (for managing other users)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix partnership_applications missing UPDATE/DELETE policies
CREATE POLICY "Users can update own applications"
ON public.partnership_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
ON public.partnership_applications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
