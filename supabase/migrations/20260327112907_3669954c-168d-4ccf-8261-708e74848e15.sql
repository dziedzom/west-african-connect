
-- Drop overly permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- Tighter INSERT policy for contact_messages: require non-empty fields
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (
  length(trim(name)) > 0 AND
  length(trim(email)) > 0 AND
  email ~* '^[^@]+@[^@]+\.[^@]+$' AND
  length(trim(message)) > 0
);

-- Tighter INSERT policy for newsletter_subscribers: require valid email
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (
  length(trim(email)) > 0 AND
  email ~* '^[^@]+@[^@]+\.[^@]+$'
);
