CREATE OR REPLACE FUNCTION public.list_public_tenders(_limit integer DEFAULT 5000)
 RETURNS TABLE(id uuid, short_id text, slug text, title text, description text, deadline timestamp with time zone, category text, location text, organization text, portal text, status text, value_amount numeric, value_currency text, is_award_notice boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.short_id, r.slug, r.title, left(r.description, 300), r.deadline, r.category, r.location,
    r.organization, r.portal, CASE WHEN r.deadline < now() THEN 'expired' ELSE r.status END,
    r.value_amount, r.value_currency, r.is_award_notice, r.updated_at
  FROM public.scraped_rfps r
  WHERE r.africa_relevant
  ORDER BY r.deadline DESC NULLS LAST, r.id
  LIMIT least(greatest(_limit,1), 20000)
$function$;