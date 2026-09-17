# Search-based discovery pipeline

Today the scraper only sees the 44 portals we already point it at. This adds a second way in: a daily web search that looks for procurement wording across your priority countries and sectors, then feeds two separate outputs — individual tenders for review, and **candidate portals we don't yet know about**, which is the bigger prize.

Nothing about the existing scraper, filters, listings or Bid Studio changes. Search results never publish themselves.

## 1. Which search API — Brave, recommended

| | Brave Search API | Google Programmable Search |
|---|---|---|
| Cost | ~$5 per 1,000 queries, 2,000/month free | $5 per 1,000, only 100/day free, hard 10k/day cap |
| Recency filter | Native `freshness` (last day / week / month) | `dateRestrict`, weaker in practice |
| Whole-web coverage | Yes, its own index | Needs a Programmable Search engine configured to search the whole web; results skew to big sites |
| Excluding LinkedIn | `-site:linkedin.com` respected | Also possible, but each engine also carries its own site rules |
| Terms | Automated programmatic use is the product | Same, but tighter per-key quotas |

Brave, for three reasons: recency filtering is the whole point here (we don't want 2019 notices), its index surfaces small government and NGO domains that Google's PSE tends to bury, and the free tier covers testing before any bill starts. Key stored as a secret and read only inside the backend function — never in the browser.

Firecrawl also has a search endpoint, but you specifically don't want to lean on that quota twice a day, and I agree.

## 2. Query sets, editable in the database

Three small tables you can edit without a deploy:

- **Phrasings** — the nine you listed, plus French and Portuguese equivalents (`appel d'offres`, `avis d'appel public`, `manifestation d'intérêt`, `concurso público`), each with an on/off switch and a weight.
- **Sectors** — seeded from your existing labels, each with search synonyms (Marketing also matches "communications", "branding").
- **Countries** — Ghana, Nigeria, Kenya, Côte d'Ivoire, Senegal, Rwanda, Tanzania, South Africa, each with a priority number. Ghana runs first every day.

A run builds queries as `"<phrasing>" <sector> <country> -site:linkedin.com` (plus a few `-site:` exclusions for known job boards and tender-aggregator paywalls). LinkedIn is excluded at query-build time **and** any result on a linkedin.com domain is dropped before storage, so it can't slip in through a redirect.

Rotation: a full cross-product would be 9 × 23 × 8 = over 1,600 queries. Instead each run takes the next slice of the rotation — every phrasing, against the day's rotating sector and country slice — so the whole space is covered roughly weekly at a fixed daily cost. Freshness is set to the last 7 days.

## 3. The two outputs

**Individual tenders.** Each result that looks like a single notice goes into a review queue, then (on your approval) into `scraped_rfps` with `discovery_method = 'search'` — so you can compare search quality against scraped sources at any time. Extraction reuses the existing document deep-read pipeline: same value, deadline, summary and sector extraction, same Africa relevance check, same end-of-day deadline normalisation, same award-notice flagging.

**Candidate sources — the valuable one.** Results are grouped by domain across runs. When a domain produces 3 or more distinct tender-looking results, it's surfaced as a candidate portal with: domain, how many hits, which queries found it, sample titles, first and last seen, and whether it's already in `scrape_sources`. You approve, dismiss, or add it to the scraper — approving creates the `scrape_sources` row with the sensible defaults and it joins the normal daily rotation.

## 4. Guards

- **Dedupe before extraction** — URL match, then the same title-similarity key the scraper's dedupe uses, checked against all existing listings including expired ones. Duplicates are counted and discarded, never extracted (extraction is the expensive part).
- **Hard cap per run** — a configurable maximum (default 60 queries, 10 results each). The run stops at the cap even mid-rotation and picks up where it left off tomorrow.
- **Cost log** — every run records queries issued, results returned, results kept, duplicates dropped, pages read, estimated search cost and estimated document-read cost, with a running month-to-date total shown in the admin panel.
- **Same checks as scraped listings** — Africa relevance, deadline in the future, award-notice exclusion, non-tender page rejection. A search result gets no shortcuts.

## 5. Admin review queue

New tab on the scrape admin page, two lists:

- **Tenders found** — title, buyer, country, sector, deadline, value if extracted, the exact query that found it, the source domain, a link to the original page, and the extracted summary. Approve (publishes), reject with a reason (remembered, so the same URL isn't re-queued), or "not a tender" (which counts against that domain's candidate score).
- **Candidate portals** — as described above, with Add to scraper / Dismiss.

Plus a run history strip: date, queries used, results, kept, duplicates, cost.

## 6. Schedule and cost

Existing scrape batches run 06:00–06:40 UTC, enrichment at :15 past each hour, nudges 07:30. Discovery runs at **13:00 UTC** — well clear of the scrape window, and its document reads are capped so the hourly enrichment pass isn't starved.

At the proposed volume:

| | Per day | Per month |
|---|---|---|
| Search queries | 60 | ~1,825 |
| Search cost (Brave, $5/1,000) | ~$0.30 | **~$9** — and the first 2,000/month are free, so likely $0 |
| Results returned | ~600 | ~18,000 |
| Results kept after dedupe/filters (est. 3–8%) | ~20–45 | ~600–1,350 |
| Document reads (capped) | 25 | ~760 |

So: effectively free on Brave's free tier at 60 queries/day, under $10/month if we double it. The real cost is document reading, which shares the existing Firecrawl budget — hence the daily cap.

## Technical notes

- New tables (RLS on, admin-only SELECT, service-role write, GRANTs included): `discovery_queries` (phrasings), `discovery_sectors`, `discovery_countries`, `discovery_runs` (cost + counters), `discovery_results` (raw result, query, dedupe verdict, review state), `discovery_candidate_sources` (domain aggregate, review state). `scraped_rfps` gains `discovery_method` (`'scrape'` default / `'search'`) and `discovery_result_id`.
- New edge function `discover-search`: actions `run`, `status`, `approve`, `reject`, `add_source`; auth via `x-cron-secret` (reusing `SCRAPE_CRON_SECRET`) or a signed-in admin, same pattern as `scrape-rfps` and `enrich-rfps`. `verify_jwt = false` in config.toml.
- Extraction is delegated: approved results are inserted with `enrichment_status = 'pending'`, so the existing hourly `enrich-rfps` pass does the document read. No duplicate extraction logic.
- `BRAVE_SEARCH_API_KEY` requested as a secret once you approve; read server-side only.
- pg_cron job `discover-search-daily` at `0 13 * * *` via a `private.invoke_discover_search` helper, same locked credential pattern as the scrape jobs.
- Frontend: one new admin panel component plus a tab on the existing scrape page. No change to `useRFPFilters`, listings, Dashboard or Bid Studio.
