
DELETE FROM scraped_rfps WHERE portal='Ghana PPA' AND title IN ('Advertisement for New Tender','Notice for Technical Services','Contract Award Notice','Notice for Goods');
UPDATE public.scrape_sources SET enabled=false, notes=coalesce(notes,'')||' | 2026-09-17 disabled: GHANEPS published-notices list and its notice pages expose only the notice type as a title ("Notice for Goods") with 2019/2020 dates - no usable tender titles or live deadlines. Needs a different entry point; revisit.' WHERE domain='ghaneps.gov.gh';
