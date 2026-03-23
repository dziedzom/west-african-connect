

## Test Results: RFP Scraping Agent

### What worked
- The `/scrape` page renders correctly with portal selection checkboxes, custom URL input, and Run Scraper button
- Deselecting portals works properly
- The scraper ran successfully against UNGM, taking ~40 seconds
- **17 RFPs were extracted and stored** in the `scraped_rfps` database table (confirmed via direct DB query)
- The "Scrape Results" section correctly displays "UNGM: 17 RFPs" with a green checkmark

### Bug found: Scraped RFPs list shows 0
The "Scraped RFPs" list always shows 0 items despite 17 rows in the database. The root cause is that the **Supabase REST API requests are being routed to the wrong URL**.

The frontend query to `scraped_rfps` is hitting:
```text
https://supabase.com/dashboard/project/dvizkdszskstgnkloqce/settings/api-keys/rest/v1/scraped_rfps
```
Instead of:
```text
https://tjuunlzlspznabgldvjr.supabase.co/rest/v1/scraped_rfps
```

This is an **environment variable issue** — `VITE_SUPABASE_URL` appears to resolve to an incorrect dashboard URL in the preview runtime. This affects ALL Supabase client queries, not just the scraper page.

### Fix plan
1. **Investigate `VITE_SUPABASE_URL` value** — The `.env` file shows the correct value, but the runtime is using a different one. This may be a preview environment configuration issue.
2. **Auto-refresh after scrape** — The code already calls `fetchScrapedRfps()` after a successful scrape, which is correct. Once the URL issue is fixed, the list will populate automatically.

### No code changes needed
The scraper edge function, AI extraction logic, database schema, and frontend UI are all working correctly. The only issue is the Supabase URL misconfiguration in the preview environment.

