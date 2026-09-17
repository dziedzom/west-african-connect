DELETE FROM public.opportunity_tracker
WHERE rfp_id IN (SELECT id FROM public.scraped_rfps WHERE portal = 'Ethiopia PPA');

DELETE FROM public.scraped_rfps WHERE portal = 'Ethiopia PPA';

UPDATE public.scrape_sources
SET enabled = false,
    notes = COALESCE(notes || ' | ', '') || 'Disabled 2026-09-17: ppa.gov.et is the regulator site and publishes no tender notices (only news, galleries, events, vacancies). Ethiopian federal tenders live on the authenticated production.egp.gov.et eGP portal, which cannot be scraped.',
    updated_at = now()
WHERE domain = 'ppa.gov.et';