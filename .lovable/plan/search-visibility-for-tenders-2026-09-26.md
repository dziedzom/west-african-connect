# Search visibility for tenders

## What exists today (checked)
- Tenders only open in a pop-up on /rfps. **There is no page per tender**, so none of the listings can be found through search.
- The sitemap is a hand-written file with 7 marketing pages. No tenders in it.
- robots.txt allows all crawlers and points at the sitemap. Fine.
- Google Search Console is **not connected** to this project, so there's no indexing, coverage or ranking data to check yet. Nothing can be concluded about current rankings until it's connected.
- The site is built so pages are put together in the visitor's browser. Google can still read these, but more slowly and less reliably. Link previews on LinkedIn, WhatsApp and Slack can't read them at all.

## Priority order

### Will actually move traffic
1. **A page for every tender** at `/tenders/{country}/{slug}-{shortid}`, for example `/tenders/ghana/ghana-health-service-printing-iec-materials-a1b2`.
   - Title: `{Tender title} – {Buyer}, {Country} | Deadline {date}` (cut to about 60 characters).
   - Description: the first 150 characters of the stored summary, or else "{Buyer} invites bids for {title}. {Sector} tender in {Country}, closes {date}."
   - The /rfps pop-up gets a "View full page" link, and the page has its own canonical URL.
   - Thin rows (no summary, no buyer) get `noindex` until the document read fills them in, so Google never sees a mass of near-empty pages.
2. **Server-rendered pages.** For about 200+ tender pages plus the landing pages, sending Google the finished page matters more than any other change here: pages get indexed faster, and link previews show the actual tender. This app can get that by moving to Lovable's latest template: type "/" in chat and choose "Migrate to TanStack Start" ([what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start)). I recommend doing this first. Without it, items 1 and 4 still work for Google but will get indexed more slowly.
3. **Country and sector landing pages** built from live data: `/tenders/ghana`, `/tenders/sector/marketing`, and later combined ones like `/tenders/ghana/marketing`.
   - Each page has a heading, live counts (open, closing soon, total recorded value where known), a list of open tenders, a section of recent expired ones, the top buyers, and links to related countries and sectors.
   - All text comes from live data. No written filler.
   - A page is only indexable once it has at least 3 open tenders plus 5 in total. Pages below that are `noindex`, which matches the "no inflated numbers" rule.
   - "Marketing and communications" groups the five marketing sectors on one page.
4. **Keep expired tenders on the site and in search.** The page stays up with a clear "Closed on {date}" banner, links to similar open tenders, and the buyer's other notices. Award notices get a "Contract award" label and stay indexable. They're good market information.

### Housekeeping
5. **Sitemap that updates itself.** A backend function serves `/sitemap.xml` as a sitemap index with separate files for marketing pages, landing pages and tenders (split into files of up to 5,000). It reads the database on every request, so new, reclassified and expired tenders show up automatically. `lastmod` comes from when each listing's content last changed, never from build time. robots.txt stays as it is. If we don't migrate, the site's hosting has to send `/sitemap.xml` to that function.
6. **Structured data.**
   - **Not JobPosting.** Google's rules limit it to job vacancies, and using it for tenders risks a manual penalty and losing rich results across the whole site.
   - No schema type earns a rich result for procurement notices. The closest honest fit is `WebPage` + `BreadcrumbList` (breadcrumbs do show in results), with the tender described as a schema.org `Demand`: the buyer as `seeker` (Organization), the deadline as `validThrough`, the country as `areaServed`, the value as `priceSpecification` when known, and the category.
   - Landing pages use `CollectionPage` + `ItemList`.
7. **Connect Search Console** (one step from you), then submit the sitemap, then check indexing and coverage after about 2 weeks. That's also when we find out what, if anything, you rank for today.
8. Internal links: footer and /rfps link to the top country and sector pages, and each tender page links to its country and sector pages.

## Public vs account (same page for Google and people, no cloaking)

| Signed-out visitor and Google see | Needs an account |
|---|---|
| Title, buyer, country, sector, deadline, status, recorded value, full summary, link to the official notice, documents list | AI match score, win probability, gap analysis |
| Similar tenders, buyer's other notices | Save/track, alerts, Bid Studio analysis and drafting, proposal pipeline |

The gated parts appear as a clearly labelled "Sign in to analyse this tender" panel. Google and visitors get exactly the same page. There's no paywall schema, because none of the text in the page is hidden.

## Technical details
- New routes `/tenders/:country/:slug`, `/tenders/:country`, `/tenders/sector/:sector`. The page loads a tender by short id, and an outdated slug redirects to the correct one. This is new and separate: the /rfps filters and pop-up stay as they are.
- New `slug` column on scraped_rfps, filled from title + id (set once, stays stable). Public read continues through the existing africa_relevant policy.
- Per-page head tags and JSON-LD. On TanStack these are sent from the server. On the current setup they go through the existing SEO component and only Google sees them.
- Sitemap edge function (public, cached for 1 hour) replaces the static public/sitemap.xml.
- Rough scale today: 200+ live tenders plus the expired archive, about 43 country pages and about 23 sector pages, most of which will be `noindex` until they meet the threshold.
