import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import TenderRow from "@/components/tenders/TenderRow";
import { usePublicTenders } from "@/hooks/usePublicTenders";
import {
  LANDING_MIN_OPEN, LANDING_MIN_TOTAL, SECTOR_GROUPS, SITE_URL, countrySlug, fmtValue, isOpen,
  sectorGroupFor, slugify, tenderPath, type PublicTender,
} from "@/lib/tenderSeo";

/** Country page (/tenders/:country) or sector page (/tenders/sector/:sector), built only from live data. */
const TenderLanding = ({ kind }: { kind: "country" | "sector" }) => {
  const { country = "", sector = "" } = useParams();
  const { data: all = [], isLoading } = usePublicTenders();

  const view = useMemo(() => {
    const sectors = Array.from(new Set(all.map((t) => t.category).filter(Boolean))) as string[];
    let label = "";
    let rows: PublicTender[] = [];
    if (kind === "country") {
      rows = all.filter((t) => countrySlug(t.location) === country);
      label = country === "africa" ? "Africa (regional and multi-country)" : rows.find((r) => r.location)?.location ?? "";
    } else {
      const g = sectorGroupFor(sector, sectors);
      if (g) {
        label = g.label;
        rows = all.filter((t) => t.category && g.sectors.includes(t.category));
      }
    }
    const open = rows.filter((t) => isOpen(t) && !t.is_award_notice).sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
    const closed = rows.filter((t) => !open.includes(t)).slice(0, 20);
    const usd = open.filter((t) => t.value_currency === "USD" && t.value_amount).reduce((s, t) => s + (t.value_amount ?? 0), 0);
    const buyers = Object.entries(rows.reduce<Record<string, number>>((m, t) => {
      if (t.organization) m[t.organization] = (m[t.organization] ?? 0) + 1;
      return m;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const facet = kind === "country"
      ? Object.entries(open.reduce<Record<string, number>>((m, t) => { if (t.category) m[t.category] = (m[t.category] ?? 0) + 1; return m; }, {}))
          .sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n, to: `/tenders/sector/${slugify(name)}` }))
      : Object.entries(open.reduce<Record<string, { n: number; loc: string }>>((m, t) => {
          const s = countrySlug(t.location);
          m[s] = { n: (m[s]?.n ?? 0) + 1, loc: s === "africa" ? "Africa (regional)" : t.location! };
          return m;
        }, {})).sort((a, b) => b[1].n - a[1].n).map(([s, v]) => ({ name: v.loc, n: v.n, to: `/tenders/${s}` }));
    return { label, rows, open, closed, usd, buyers, facet };
  }, [all, kind, country, sector]);

  const path = kind === "country" ? `/tenders/${country}` : `/tenders/sector/${sector}`;
  const heading = kind === "country"
    ? `Tenders in ${view.label || country}`
    : `${view.label || sector} tenders in Africa`;
  const indexable = view.open.length >= LANDING_MIN_OPEN && view.rows.length >= LANDING_MIN_TOTAL;
  const description = `${view.open.length} open ${kind === "sector" ? (view.label || "").toLowerCase() + " " : ""}tenders${kind === "country" ? ` in ${view.label}` : " across Africa"}, from ${view.buyers.length ? view.buyers.slice(0, 3).map(([b]) => b).join(", ") : "public buyers"}. Updated daily from official procurement sources.`;

  if (!isLoading && view.rows.length === 0) {
    return (
      <div className="container py-24">
        <SEO title={heading} path={path} noindex />
        <h1 className="font-display text-3xl font-semibold">No tenders here yet</h1>
        <p className="mt-3 text-sm text-muted-foreground"><Link to="/rfps" className="text-accent">Browse all open tenders</Link>.</p>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: heading,
    url: `${SITE_URL}${path}`,
    description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: view.open.length,
      itemListElement: view.open.slice(0, 50).map((t, i) => ({
        "@type": "ListItem", position: i + 1, url: `${SITE_URL}${tenderPath(t)}`, name: t.title,
      })),
    },
  };

  return (
    <div className="container max-w-5xl py-16">
      <SEO title={heading} description={description} path={path} jsonLd={jsonLd} noindex={!isLoading && !indexable} />
      <nav className="mb-6 text-xs text-muted-foreground"><Link to="/rfps" className="hover:text-accent">Tenders</Link> / {view.label}</nav>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Open now" value={String(view.open.length)} />
            <Stat label="Closing soon" value={String(view.open.filter((t) => t.status === "closing_soon").length)} />
            <Stat label="In archive" value={String(view.rows.length - view.open.length)} />
            {view.usd > 0 && <Stat label="Recorded value (USD, open)" value={fmtValue(view.usd, "USD")!} />}
          </div>

          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold">Open tenders</h2>
            {view.open.length ? <ul className="mt-2">{view.open.map((t) => <TenderRow key={t.id} t={t} />)}</ul>
              : <p className="mt-2 text-sm text-muted-foreground">None open right now.</p>}
          </section>

          {view.facet.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold">{kind === "country" ? "By sector" : "By country"}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {view.facet.map((f) => (
                  <Link key={f.to} to={f.to} className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent hover:text-accent">
                    {f.name} <span className="font-data text-muted-foreground">{f.n}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {view.buyers.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold">Most active buyers</h2>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {view.buyers.map(([b, n]) => <li key={b}>{b} <span className="font-data text-xs text-muted-foreground">{n}</span></li>)}
              </ul>
            </section>
          )}

          {view.closed.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold">Recently closed and awarded</h2>
              <ul className="mt-2">{view.closed.map((t) => <TenderRow key={t.id} t={t} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-card p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 font-data text-xl">{value}</div>
  </div>
);

export const SECTOR_GROUP_SLUGS = Object.keys(SECTOR_GROUPS);
export default TenderLanding;
