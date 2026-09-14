# The outcome loop

Close the circle between what the AI predicted and what actually happened, so win probability and match scores become measurable — and so a won contract records its 3.5% fee automatically instead of relying on goodwill.

## 1. How a user records an outcome

A single **opportunity tracker** replaces the browser-only "saved" list. One row per user per listing, with a status:

- `interested` — set automatically the moment someone saves a listing, generates an insight, or runs a Bid Studio tool against it
- `preparing` — set automatically when a bid draft, review or checklist is created for it
- `submitted` — user taps "I submitted this"
- `won` / `lost` / `no_decision_yet` / `not_pursued` — reported after the deadline

Friction: no form. Status appears as a small segmented control on the listing card, in the opportunity detail panel, and in a "Your pipeline" table on the dashboard. Reporting an outcome is one tap; only `won` opens a short follow-up (contract value + currency), reusing the existing won-contract modal. `lost` optionally asks one question ("who won / why", free text, skippable).

## 2. Linking outcomes to predictions

Predictions are **snapshotted at the moment they're shown**, never read back live (scores change as profiles change). When a user engages with a listing we store, on the tracker row:

- `predicted_match_score` + `predicted_at` (from the AI insight)
- `predicted_win_probability` + confidence (from the bid review's win probability)
- `predicted_review_score` + grade (from the bid review)
- ids of the source insight / review rows for traceability

Outcome fields on the same row: `outcome`, `outcome_reported_at`, `outcome_source` (user / admin), plus `contract_value` when won. Accuracy is then a plain query: predicted score bucket vs actual win rate. Nothing is inferred retroactively.

## 3. What prompts users to report

- **Dashboard prompt**: an "Outcomes to confirm" card listing every tracked opportunity whose deadline has passed with no outcome — one tap per row, dismissible as "no decision yet" (which re-asks in 30 days).
- **Email nudge**: a daily job finds tracker rows with a deadline 1–14 days past and no outcome, and sends at most one digest email per user per week via the existing alert email channel. Includes one-tap links that land on the dashboard with the row highlighted.
- **In-flow prompt**: opening a listing whose deadline has passed asks the outcome inline.
- Stop nudging after 3 attempts or once an outcome is set.

## 4. Success fee

When a user reports `won` with a contract value:

- Fee = 3.5% of value, capped at USD 5,000, computed **server-side** and written to `won_contracts` (existing table), linked to the tracker row and the listing.
- The user sees, before confirming: contract value, the 3.5% calculation, the capped amount, and that an invoice will follow. Confirming sets `agreement_confirmed`.
- Their dashboard shows a "Success fees" line: amount owed, invoice status, paid status — read-only.
- Recorded only. No payment processing, no invoice generation in this phase; admin still marks invoice sent / fee paid as today. Non-USD values store the original currency and value; the fee is stored in USD with the rate left for admin to confirm (flagged `needs_fx_review`).

## 5. Admin view

A new **Outcomes** tab on the admin dashboard:

- Outcomes across all users: pipeline counts by status, win rate, reported vs unreported after deadline.
- **Prediction accuracy over time**: win rate bucketed by predicted win probability (0–20 / 21–40 / … ) and by match score band, plus average predicted vs actual per month — this is the falsifiability check.
- **Which sources produce wins**: wins and win rate grouped by the listing's source portal and category, so dead sources can be cut.
- Success fee ledger: fees due, invoiced, collected (extends the existing Revenue tab rather than duplicating it).

## Technical notes

- New table `opportunity_tracker` (user_id, rfp_id → scraped_rfps, status, prediction snapshot columns, outcome columns, nudge counters, timestamps; unique on (user_id, rfp_id)). RLS: owner full access, admin read-only; GRANTs for authenticated + service_role.
- `won_contracts` gains `tracker_id`, `needs_fx_review`; success fee is written only by a service-role edge function (`record-outcome`) that recomputes the fee — clients cannot set `success_fee`, mirroring the existing privileged-column trigger pattern.
- Status transitions validated in a trigger (no jumping straight from `interested` to `won` without a value; outcomes only after a deadline or a `submitted` state).
- Prediction snapshots written by the existing `generate-ai-insights` and `bid-studio-ai` functions (additive — upsert onto the tracker row, never overwrite an existing snapshot).
- Saved-listing ids migrate from localStorage into the tracker on first load, then localStorage is retired.
- Nudge digest as a daily pg_cron job (~07:30 UTC, after the existing jobs) through the verified notify.middlbrand.com sender.
- No changes to the scraper, filters, Bid Studio tool behaviour or Pro gating.
