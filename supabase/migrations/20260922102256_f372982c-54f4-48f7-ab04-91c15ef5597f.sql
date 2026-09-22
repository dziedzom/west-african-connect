UPDATE public.scrape_sources
SET url = 'https://tenders.go.ke/tenders',
    consecutive_failures = 0,
    notes = COALESCE(notes || ' | ', '') || 'Tried 2026-09-22: the portal''s own data feed (api/active-tenders sorted newest-published-first) returns a very verbose JSON record per tender and only 1 of 8 tenders extracted, so the source is back on /tenders. Its table is client-rendered and sorted ascending, so we see the soonest-closing tenders; revisit if Kenya volume matters.'
WHERE name = 'Kenya tenders.go.ke';