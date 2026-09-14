# Retire the old opportunities table

The old `rfps` table holds 8 rows, all expired, newest from February. Public listings already read `scraped_rfps`. Everything still pointing at the old table gets moved over, then the table is renamed as deprecated (kept, not deleted, for rollback).

## Full audit of paths touching `rfps`

| # | Path | What it does today | How it gets handled |
|---|------|--------------------|---------------------|
| 1 | `src/pages/Dashboard.tsx` (~line 181) | Looks up titles for AI-matched opportunities in `rfps` | Read `scraped_rfps`; map `organization` → `org` |
| 2 | `src/components/SavedRFPsList.tsx` (~line 19) | Lists 6 newest from `rfps` — always stale/expired | Read `scraped_rfps`, only live rows (`status` open/closing_soon), newest first |
| 3 | `src/pages/ProposalBuilder.tsx` (~line 67) | Opportunity picker: `rfps` where `status='open'` — currently empty, so no proposal can be tied to an opportunity | Read `scraped_rfps` with open/closing_soon status and a future deadline, ordered by deadline |
| 4 | `src/pages/AdminDashboard.tsx` (~line 145) | Counts rows in both tables | Drop the old-table count tile; keep the `scraped_rfps` count |
| 5 | `supabase/functions/generate-ai-insights` (~line 44) | Fetches the opportunity from `rfps` | Read `scraped_rfps`. **This is a live bug**: the detail modal on the listings page passes a `scraped_rfps` id, so the lookup fails and AI insights never generate from listings |
| 6 | `supabase/functions/draft-proposal` (~line 29) | Same lookup against `rfps` | Same fix; field names normalised (`organization`, `budget`, `location`) |
| 7 | `supabase/functions/process-agent-rfp` (~line 100) | External agent **writes** new opportunities into `rfps` | Write into `scraped_rfps` instead, with `portal='Agent API'`, source category and Africa flag set, deadline status computed the same way as the scraper |

## Relationships pointing at old rows

| Relationship | State | Handling |
|---|---|---|
| `ai_insights.rfp_id` → `rfps.id` | 0 rows | Repoint the foreign key to `scraped_rfps` |
| `proposals.rfp_id` → `rfps.id` | 0 rows | Repoint the foreign key to `scraped_rfps` |
| `bid_drafts.rfp_id` | Already → `scraped_rfps` | No change |
| `won_contracts.rfp_id` | No foreign key, 0 rows | No change |
| Saved opportunities | Stored in the browser only (`localStorage`), ids only | Nothing to migrate; stale ids simply stop matching |

Because both dependent tables are empty, no data needs copying and no id remapping is required. The 8 old rows are not migrated — every one is expired and duplicated in spirit by live scraped data.

## Deprecating the table

- Rename `public.rfps` → `public.rfps_deprecated_20260914`, keeping all 8 rows.
- Revoke app access (`anon`, `authenticated`); `service_role` keeps access so it can be inspected or restored.
- Rollback = rename it back and revert the code changes.

## Verification

- Confirm nothing in `src/` or `supabase/functions/` references the old table.
- Load the dashboard, proposal builder and listings detail modal; generate an AI insight from a listing to prove path 5 now works.
