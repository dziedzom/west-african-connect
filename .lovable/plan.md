# Export the UI Walkthrough as a Document

## What
Save the full UI description of MiddlBrand (the walkthrough already given in chat) as a standalone Markdown file in Files, so you can open and copy from it.

## Deliverable
- **File:** `/mnt/documents/middlbrand-ui-overview.md`
- **Format:** Markdown (`.md`), plain text — headings, bullet lists, no images.
- **Content:** The current UI of the app, organized by area:
  1. Shell (navbar + footer) — floating pill nav, link sets, dark mode toggle, notifications, Free/Pro badge, Admin/Dashboard buttons, Sign In; footer with newsletter subscribe + social links + wordmark.
  2. Public site (Index) — hero, stats row, "How It Works" bento grid, testimonials, dark CTA.
  3. RFPs page — filters (search, category, location, date range, budget, Africa toggle), deadline chips, pagination, UpgradeBanner, RFPDetailModal.
  4. Dashboard — stats cards, live tender counter, ManagedEngagementPanel, OutcomeLoopPanels, Proposal Pipeline, Top AI Matches, AI-Tracked Tenders, Saved RFPs.
  5. Admin — AdminDashboard tabs (scraper coverage, partnerships, verification queue, managed bids, outcomes); AdminManaged (board/prospects/pipeline); AdminEngagement detail (overview/documents/bid-work/pairing/commission/activity); ProspectsPanel (add/edit/convert).
  6. Bid Studio — Analyser, Writer, Reviewer, Checklist (Pro-gated, attribution via ?engagement=), BidHistory (personal only).
  7. Outcome loop — OutcomeControl, WonContractModal, ManagedEngagementPanel (client view, no commission/notes).
  8. Supporting pages — Pricing, Partnerships, About, Contact, Join/CompanySignUp, Knowledge Base, Learn Center, Auth/Forgot/Reset, ProfileSettings, 404.

## Scope
- Documentation only. No code changes, no schema changes, no behavior changes.
- Reflects the app *as currently built* (snapshot from this conversation). Not a spec for future work.

## After approval
Create the file at `/mnt/documents/middlbrand-ui-overview.md` and present it as a downloadable artifact.
