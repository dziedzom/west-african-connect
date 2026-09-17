
DELETE FROM scraped_rfps WHERE portal='Ghana PPA' AND title IN ('Advertisement for New Tender','Notice for Technical Services','Contract Award Notice','Notice for Goods');
DELETE FROM scraped_rfps WHERE portal='Islamic Development Bank' AND scraped_at > now() - interval '2 hours';
UPDATE public.scrape_sources SET follow_detail_pages=true, detail_link_pattern='viewPublishedContractNotice.do', detail_max_per_run=8, notes=coalesce(notes,'')||' | 2026-09-17: detail-page follow enabled - the e-GP summary table carries notice types and publication dates, real titles/deadlines are on the notice page.' WHERE domain IN ('ghaneps.gov.gh','eprocure.zppa.org.zm');
UPDATE public.scrape_sources SET enabled=false, notes='2026-09-17 disabled: project-procurement/tenders listing is a historic archive - the dates published are notice dates, not submission deadlines, so every row imports as already expired and many are contract awards. Revisit if IsDB publishes deadlines.' WHERE domain='isdb.org';
