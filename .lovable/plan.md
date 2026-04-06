## Hybrid Monetisation Upgrade Plan

### Phase 1 — Database Changes
- Add subscription columns to `profiles` table (subscription_tier, subscription_plan, subscription_start, subscription_end, subscription_amount)
- Create `won_contracts` table with auto-calculated success fee (3.5%, capped at $5,000)
- Add RLS policies for both

### Phase 2 — Auth & Subscription Context
- Extend AuthContext to expose `subscriptionTier` (free/pro)
- Create a `useSubscription` hook for gating logic
- Create an `UpgradeModal` component for free users clicking gated features

### Phase 3 — Pricing Page Overhaul
- Replace current commission-based pricing with 3-column Free / Pro Monthly / Pro Annual
- Update FAQ section with new questions
- Add monthly/annual toggle with savings callout

### Phase 4 — RFP Gating & Pro Features
- Add upgrade CTA banner on /rfps for free users
- Gate AI match score badge, detail page, "I'm Bidding" button behind Pro
- Show upgrade modal when free users click gated features

### Phase 5 — Won Contract Flow
- "I Won This Contract" button on RFP detail (Pro only)
- Modal with contract value input, currency selector, live fee calculation
- Save to won_contracts table

### Phase 6 — Admin Revenue Dashboard
- Revenue summary bar (MRR, ARR, success fees)
- Subscriptions table
- Won contracts table with actions

### Phase 7 — Invoice Emails (deferred)
- Requires email domain setup — will scaffold after core features work

### What stays untouched:
- Scraper, cron jobs, RFP filters, existing display logic
