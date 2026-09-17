# Real value extraction: filling value, deadline and source from official tender documents

Today every listing shows a deadline only when the portal page printed one, no contract value at all, and a source link that is often the listing page rather than the buyer's own notice. This adds a second, separate pass that goes deeper: it opens each opportunity's own page, opens the tender documents attached to it, and records only what is literally written there.

## What each listing gains

- **Value** — the money figure with its currency and what the figure actually is (estimated budget, ceiling/maximum, or awarded amount), plus the exact sentence it came from and the document it came from.
- **Deadline** — recovered for listings that currently have none, taken from the notice or the tender document.
- **Official source** — the buyer's own notice page, and the list of tender document links found, so a company can go straight to the real paperwork instead of an aggregator page.

Nothing is inferred. If a document does not state a figure, the listing keeps no value — an empty value is a correct outcome, never a guess, never a range, never "TBD". Same rule already used for deadlines.

## How it runs

A new deep-read job runs on a schedule, separate from the existing scraper so nothing about scraping, filtering, /try, Bid Studio or Pro logic changes.

Each run:
1. Picks a small, fixed number of listings that still need a value, a deadline, or an official source — soonest deadlines and newest listings first.
2. Opens the listing's own page and collects the document links on it (PDF, Word, Excel, ZIP tender packs).
3. Reads the page and up to a few of its documents.
4. Asks the AI, in one strict call per listing, for value, currency, what the figure represents, deadline, official notice URL, and the supporting quote — with null allowed for every field.
5. Writes the result, marks the listing as read, and moves on.

Safety rails, because this is unattended work that costs money per call:
- Fixed batch size and a per-run time budget.
- A lock row so two runs never overlap.
- Each listing marked done (or failed with a reason and an attempt count) as it completes, so a re-run never redoes finished work. After three failed attempts a listing is parked.
- The job halts and parks itself if the AI or scraping credentials are refused or credits run out, and every entry point checks that parked state before doing work. It uses the alert channel the scraper already uses.

## Currency

Values are stored in their own currency, exactly as written. Only US dollar figures are added into the homepage total, which is labelled accordingly; non-dollar values are flagged for a rate check, matching how won contracts already work. No invented conversion rates.

## Where it shows

- **Listings** — the value column already appears only when the results actually contain values, and will start showing them as extraction fills in. Figures render in the mono data face with currency; missing values show a dash. A "documents" link appears when tender documents were found.
- **Opportunity detail** — value with its basis and the quote it came from, deadline source, official notice link, and the document list.
- **Homepage stats** — the recorded-value total switches from guessing at text budget strings to summing real extracted dollar figures. Still hidden while it is zero.
- **Admin** — a coverage panel on the scrape page: how many listings have a value, a deadline, an official source; how many are parked with what error; and a button to re-queue a listing or run a batch now.

## Technical notes

- Migration on `scraped_rfps`: `value_amount numeric`, `value_currency text`, `value_basis text`, `value_evidence text`, `value_source_url text`, `value_confidence text`, `needs_fx_review boolean`, `official_source_url text`, `document_urls text[]`, `enrichment_status text` (pending/done/failed/parked), `enrichment_attempts int`, `enrichment_error text`, `enriched_at timestamptz`, plus a partial index on the pending queue. Existing `budget` text is kept and populated with a formatted display string so current UI keeps working.
- New table `enrichment_job_state`: single-flight lease row with expiry plus paused/parked flag and reason; RLS on, admin read, service-role write.
- New edge function `enrich-rfps` (`verify_jwt = false`, admin or `x-cron-secret` authenticated, same pattern as `scrape-monitor`): batch of 8 listings, 2 documents per listing, ~110s budget, Firecrawl via the existing gateway for both pages and PDFs, one `google/gemini-2.5-flash` function-calling request per listing with a strict no-inference schema (every field nullable).
- Gateway error handling per the standard contract: 429/5xx bounded backoff, 402/403 park the job and alert, 400/401 fail loudly.
- `refresh_homepage_live_stats()` rewritten to sum `value_amount` where currency is USD instead of regex-parsing `budget`.
- pg_cron job every 30 minutes via the same locked `private.cron_settings` credential pattern as the scrape jobs.
- Frontend: `RFPListings.tsx` value column reads `value_amount`/`value_currency`; `RFPDetailModal.tsx` gains value basis, evidence, official link and documents; new `EnrichmentCoveragePanel` on the scrape admin page.
