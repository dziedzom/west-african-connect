

## Auto-Scheduled Scraping with pg_cron

### What we're building
1. Enable `pg_cron` and `pg_net` extensions
2. Create a cron job that calls the `scrape-rfps` edge function daily at 6 AM UTC
3. Add a "Last scraped" timestamp display on the Dashboard

### Steps

**Step 1: Database migration — enable extensions**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Step 2: Insert cron job (via insert tool, not migration)**
Schedule a daily 6 AM UTC job that POSTs to the `scrape-rfps` edge function with all default portals:
```sql
SELECT cron.schedule(
  'daily-rfp-scrape',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://tjuunlzlspznabgldvjr.supabase.co/functions/v1/scrape-rfps',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGci..."}'::jsonb,
    body:='{"portals": ["UNGM", "AfDB", "SA eTenders"]}'::jsonb
  ) as request_id;
  $$
);
```

**Step 3: Update Dashboard UI**
- Query `scraped_rfps` for `MAX(scraped_at)` to get last scrape timestamp
- Display a small "Last scraped: X hours ago" indicator near the AI-Scraped Opportunities section header
- Use relative time formatting (e.g., "2 hours ago", "Yesterday at 6:00 AM")

### Files affected
- `src/pages/Dashboard.tsx` — add last-scraped timestamp display
- Database: 1 migration (extensions) + 1 insert (cron schedule)

