
- Public tender SEO pages (/tenders/...) read via SECURITY DEFINER RPCs get_public_tender/list_public_tenders over plain REST — expired rows must be public without widening scraped_rfps RLS.
- Live sitemap is the `sitemap` edge function, referenced from robots.txt; slug/path logic duplicated in src/lib/tenderSeo.ts and must stay in sync.
