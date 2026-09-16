# Managed Bid Workspace (admin-only)

A separate admin area where you run bids on behalf of companies — including ones not yet on the platform — mirroring your real workflow from finding the tender through to submission and commission.

Nothing in the self-serve experience changes. Existing pages, the 3.5% success fee, the scraper and Bid Studio for normal users stay exactly as they are.

## Where it lives

New admin-only section at `/admin/managed`, reachable from the Admin Dashboard next to the Verification Queue.

- **Engagements board** — all engagements grouped by stage, with company, opportunity, commission value and next action.
- **Engagement detail** — one page per engagement, the place you work from: overview, documents, bid work, partnership, commission, activity.
- **Prospects** — companies you're targeting who aren't users yet.
- **Pipeline summary** — expected commission by stage, win rate, aging engagements.

## 1. Prospects

Tracked separately from real accounts: company name, sector, capabilities, country/location, contact name, email, phone, source of the lead, status (new, contacted, interested, engaged, converted, dormant), free-text notes.

Each prospect lists its engagements. A "Convert" action links the prospect to a real account (see section 7).

## 2. Engagements — the core object

An engagement links **one company** (either a prospect or a signed-up user) to **one opportunity** (a scraped listing, or a manually entered tender when it came from outside the platform).

Stages, in order: identified → documents assembling → bid drafting → offer made → terms agreed → submitted → shortlisted → won → lost.

Each stage change is recorded with a timestamp so you can see how long anything has been sitting. Alongside stages there's an activity log for real-world events — "procurement site visit", calls, meetings, negotiation notes — each with a date, type and note.

Seeded on launch: **Reach Marketing** at stage *shortlisted*, with the procurement site visit logged as an activity.

## 3. Documents

Per engagement, a checklist of what this tender requires: document name, type, who provides it (you or the company), status (required, requested, received, verified, signed, submitted, not applicable), due date, notes, and where it sits — either a file uploaded into a private admin store or a note of an external location.

The detail page shows outstanding versus collected at a glance, so you always know what's blocking submission.

## 4. Bid Studio attributed to an engagement

When you open the Analyser, Writer, Reviewer or Checklist from inside an engagement, the work is saved against that engagement instead of landing loose in your own history. Existing saved history for normal users is untouched; engagement work simply carries the engagement it belongs to and is filtered out of your personal history view.

The engagement detail page lists all bid work produced for it, so the analysis, draft and review sit together.

## 5. Partnership pairings

Where you're proposing two companies bid together: a pairing records both sides (each can be a prospect or a user), which is lead and which is partner, the rationale, and a status per side (proposed, approached, accepted, declined) plus an overall pairing status.

A pairing can be attached to an engagement, so the bid clearly belongs to the pair.

## 6. Commission tracking

Per engagement: project value and currency, commission rate defaulting to 20% and editable per engagement, expected commission (value × rate, calculated server-side), and status (projected, agreed, invoiced, paid, written off) with dates and notes.

Kept entirely separate from the self-serve 3.5% success fee — different table, different admin panel, never mixed in the existing revenue figures. Non-dollar values are flagged for a rate check, as elsewhere.

## 7. Conversion — prospect becomes a user

When a prospect signs up, you convert them from their prospect page:

1. You pick the matching account (matched on email, confirmed by you).
2. Their engagements, documents, bid work and commission records are re-pointed to that account.
3. On their next sign-in, their dashboard shows the engagement already in flight — stage, documents collected and outstanding, and the bid analysis, draft and review already produced.

What the company sees is a read-mostly view: they can see progress, download and confirm documents, and read the bid work. They never see your commission figures or internal notes. Conversion is reversible in the sense that nothing is deleted — the prospect record stays, marked converted and linked to the account.

## Technical notes

- New tables: `prospects`, `engagements`, `engagement_activities`, `engagement_documents`, `engagement_partnerships`, `engagement_commissions`. Each with owner-admin RLS; the converted company gets read access to its own engagement, activities (non-internal), documents and bid work only — never commissions or internal notes.
- `engagements` holds either `prospect_id` or `client_user_id` (exactly one, enforced), plus `rfp_id` referencing `scraped_rfps` or manual tender fields (title, buyer, deadline, source URL).
- Stage and status values validated by triggers (matching the existing pattern), `updated_at` triggers throughout.
- Bid Studio attribution: nullable `engagement_id` on `bid_analyses`, `bid_drafts`, `bid_reviews`, `submission_checklists`; existing rows unaffected; personal history filters `engagement_id is null`.
- Documents reuse a private storage bucket with admin-write, client-read-own paths.
- Expected commission computed as a generated column, mirroring how the success fee is handled, so it can't be edited from the browser.
- Server-side edge function for conversion (re-pointing rows atomically under service role) and for commission status changes.
- Routes: `/admin/managed`, `/admin/managed/engagements/:id`, `/admin/managed/prospects`, all behind the existing admin guard. Client-facing view added to the existing dashboard as a panel, only shown when an engagement exists.
