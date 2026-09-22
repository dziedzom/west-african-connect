UPDATE public.scrape_sources
SET url = 'https://tenders.go.ke/api/active-tenders?search=&perpage=8&sortby=published_at&order=desc&page=1'
WHERE name = 'Kenya tenders.go.ke';