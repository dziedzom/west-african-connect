# Monitoring & alerting for the scraper

Goal: no credential or source failure ever runs silently again. Every scrape run is recorded with its real HTTP status and body, auth failures alert immediately, and a freshness panel makes staleness visible at a glance.

## 1. Run history (the foundation)
A new `scrape_run_log` table records every invocation: which batch, real HTTP status code, the response body, portals processed, rows saved, duration, and any auth/credential error text found in the body. The scrape function writes its own row at the end of each run, and the cron helper also records the HTTP status it actually received — so a 401 with an empty body still produces a row. pg_cron's own job status is never used as evidence.

A second table, `scrape_alert_log`, records every alert sent (type, subject, detail, when) so the same alert isn't emailed repeatedly — auth alerts are throttled to once per hour, disable/heartbeat alerts once per day.

## 2. Immediate auth alerts
Inside the scrape function, any Firecrawl or AI response with status 401/403, or a body containing "invalid token" / "unauthorized", triggers an immediate alert email naming the failing service, source, status and message. The cron helper does the same when the scrape function itself returns 401/403.

## 3. Daily heartbeat
A new job at 07:15 UTC (after the nine 06:00–06:40 scrape runs) checks two things over the last 48 hours: did any source record a success, and were any new listings written. If either is false it emails an alert with the last successful run time, the number of sources with no success in 48h, and the most recent errors. It also verifies at least one `scrape_run_log` row with HTTP 200 exists in that window — so a run that never reached the function is caught too.

## 4. Auto-disable alerts
When the scrape function auto-disables a source after repeated failures, it sends an alert naming the source, the reason (its last error), the failure count, and how long it stays off.

## 5. Freshness panel (admin)
A new panel on the admin scrape page shows, per source: name, category, last successful run (relative), row count in the last 7 days, enabled/disabled state, consecutive failures, and last error. Rows with no success in over 72 hours turn red; 24–72 hours amber; under 24 hours green. Top summary strip shows total sources, how many are stale, how many auto-disabled, rows in the last 7 days, and the last recorded run with its HTTP status. Fed by a new admin-only edge function reading the run log and source health.

## Email channel — needs one setup step from you
Alerts go by email using Lovable's built-in email sending, to the admin address already configured for the project. That requires a sender domain you own to be set up once (middlbrand.com works) — I can't send a real test delivery until that's done, and it's the one thing I can't do for you.

After it's verified I will: send a real test alert to your admin address, deliberately break the Firecrawl credential to confirm the auth alert fires, run the heartbeat against a stale window to confirm it fires, and show you the delivery records for all three.

## Technical notes
- `scrape_run_log` and `scrape_alert_log`: RLS on, admin-only SELECT, service-role full access, GRANTs included.
- New edge functions: `scrape-monitor` (heartbeat + freshness read, admin/cron authenticated) reusing the existing `x-cron-secret` pattern; alert sending centralised in `_shared/scrape-alerts.ts` used by both `scrape-rfps` and `scrape-monitor`.
- Heartbeat cron uses `private.invoke_scrape_monitor`, same locked `private.cron_settings` credential pattern as the scrape jobs.
- No change to scraping logic, batch sizing, the nine daily jobs, expiry job, /try, Bid Studio, or Pro-tier logic.
