UPDATE public.scrape_sources
SET url = 'https://egpuganda.go.ug/bid-notices',
    consecutive_failures = 0,
    auto_disabled_until = NULL,
    notes = COALESCE(notes || ' | ', '') || 'Repointed 2026-09-22: the site root is a landing page carrying 2022/2023 items, so most rows arrived already expired. /bid-notices lists live bid notices with publish and closing dates (100 date cells on first read).'
WHERE name = 'Uganda EGP';

UPDATE public.scrape_sources
SET url = 'https://tenders.go.ke/api/active-tenders?search=&perpage=20&sortby=published_at&order=desc&page=1',
    consecutive_failures = 0,
    auto_disabled_until = NULL,
    notes = COALESCE(notes || ' | ', '') || 'Repointed 2026-09-22: /tenders renders its table client-side from this feed with order=asc, so only the soonest-closing tenders were ever read (all 30 rows arrived with under 3 days left). This feed is the same data sorted newest-published first, 20 per page.'
WHERE name = 'Kenya tenders.go.ke';