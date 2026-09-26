ALTER TABLE public.scraped_rfps ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.scraped_rfps ADD COLUMN IF NOT EXISTS short_id text GENERATED ALWAYS AS (left(replace(id::text,'-',''),8)) STORED;
CREATE INDEX IF NOT EXISTS idx_scraped_rfps_short_id ON public.scraped_rfps(short_id);

CREATE OR REPLACE FUNCTION public.seo_slugify(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(trim(both '-' from left(regexp_replace(lower(
    translate(coalesce(t,''),'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ''’','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn  ')
  ), '[^a-z0-9]+', '-', 'g'), 80)), ''), 'tender')
$$;

CREATE OR REPLACE FUNCTION public.set_scraped_rfp_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.seo_slugify(NEW.title);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_scraped_rfp_slug ON public.scraped_rfps;
CREATE TRIGGER trg_set_scraped_rfp_slug BEFORE INSERT OR UPDATE OF title ON public.scraped_rfps
FOR EACH ROW EXECUTE FUNCTION public.set_scraped_rfp_slug();

UPDATE public.scraped_rfps SET slug = public.seo_slugify(title) WHERE slug IS NULL;

-- Public tender pages (includes expired + award notices). Only public, non-sensitive columns.
CREATE OR REPLACE FUNCTION public.get_public_tender(_short_id text)
RETURNS TABLE(id uuid, short_id text, slug text, title text, description text, deadline timestamptz,
  category text, location text, organization text, portal text, status text, source_url text,
  official_source_url text, document_urls text[], value_amount numeric, value_currency text,
  value_basis text, is_award_notice boolean, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.short_id, r.slug, r.title, r.description, r.deadline, r.category, r.location,
    r.organization, r.portal, CASE WHEN r.deadline < now() THEN 'expired' ELSE r.status END,
    r.source_url, r.official_source_url, r.document_urls, r.value_amount, r.value_currency,
    r.value_basis, r.is_award_notice, r.created_at, r.updated_at
  FROM public.scraped_rfps r
  WHERE r.africa_relevant AND r.short_id = lower(_short_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.list_public_tenders(_limit int DEFAULT 5000)
RETURNS TABLE(id uuid, short_id text, slug text, title text, description text, deadline timestamptz,
  category text, location text, organization text, portal text, status text,
  value_amount numeric, value_currency text, is_award_notice boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.short_id, r.slug, r.title, left(r.description, 300), r.deadline, r.category, r.location,
    r.organization, r.portal, CASE WHEN r.deadline < now() THEN 'expired' ELSE r.status END,
    r.value_amount, r.value_currency, r.is_award_notice, r.updated_at
  FROM public.scraped_rfps r
  WHERE r.africa_relevant
  ORDER BY r.deadline DESC NULLS LAST
  LIMIT least(greatest(_limit,1), 20000)
$$;

REVOKE ALL ON FUNCTION public.get_public_tender(text) FROM public;
REVOKE ALL ON FUNCTION public.list_public_tenders(int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_tender(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_public_tenders(int) TO anon, authenticated, service_role;