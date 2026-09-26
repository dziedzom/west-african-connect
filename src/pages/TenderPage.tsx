import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import TenderRow from "@/components/tenders/TenderRow";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicTender, usePublicTenders } from "@/hooks/usePublicTenders";
import {
  SITE_URL, countrySlug, fmtDate, fmtValue, isOpen, isThin, slugify, tenderPath,
} from "@/lib/tenderSeo";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const TenderPage = () => {
  const { country = "", slug = "" } = useParams();
  const shortId = slug.split("-").pop();
  const { data: t, isLoading } = usePublicTender(shortId);
  const { data: all = [] } = usePublicTenders();
  const { user } = useAuth();

  const related = useMemo(() => {
    if (!t) return { similar: [], buyer: [] };
    const others = all.filter((o) => o.id !== t.id);
    const similar = others
      .filter((o) => isOpen(o) && !o.is_award_notice && (o.category === t.category || countrySlug(o.location) === countrySlug(t.location)))
      .sort((a, b) => Number(b.category === t.category) - Number(a.category === t.category))
      .slice(0, 6);
    const buyer = t.organization ? others.filter((o) => o.organization === t.organization).slice(0, 5) : [];
    return { similar, buyer };
  }, [t, all]);

  if (isLoading) return <div className="container py-24 text-sm text-muted-foreground">Loading tender…</div>;
  if (!t) {
    return (
      <div className="container py-24">
        <SEO title="Tender not found" path={`/tenders/${country}/${slug}`} noindex />
        <h1 className="font-display text-3xl font-semibold">Tender not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This notice isn't in our library. <Link className="text-accent" to="/rfps">Browse open tenders</Link>.</p>
      </div>
    );
  }

  const path = tenderPath(t);
  if (path !== `/tenders/${country}/${slug}`) return <Navigate to={path} replace />;

  const open = isOpen(t) && !t.is_award_notice;
  const cSlug = countrySlug(t.location);
  const countryLabel = cSlug === "africa" ? "Africa" : t.location!;
  const value = fmtValue(t.value_amount, t.value_currency);
  const deadlineText = t.deadline ? fmtDate(t.deadline) : null;

  const title = clip(`${t.title} – ${t.organization ?? countryLabel}${deadlineText ? ` | Deadline ${deadlineText}` : ""}`, 70);
  const description = clip(
    t.description && t.description.length >= 40
      ? t.description
      : `${t.organization ?? "A buyer"} invites bids for ${t.title}. ${t.category ?? "Public"} tender in ${countryLabel}${deadlineText ? `, closes ${deadlineText}` : ""}.`,
    155,
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t.title,
      url: `${SITE_URL}${path}`,
      description,
      dateModified: t.updated_at,
      mainEntity: {
        "@type": "Demand",
        name: t.title,
        description: t.description ?? undefined,
        category: t.category ?? undefined,
        ...(t.deadline ? { validThrough: t.deadline } : {}),
        availability: open ? "https://schema.org/InStock" : "https://schema.org/Discontinued",
        areaServed: { "@type": "Country", name: countryLabel },
        ...(t.organization ? { seeker: { "@type": "Organization", name: t.organization } } : {}),
        ...(t.value_amount ? { priceSpecification: { "@type": "PriceSpecification", price: t.value_amount, priceCurrency: t.value_currency ?? undefined } } : {}),
        url: t.official_source_url || t.source_url,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tenders", item: `${SITE_URL}/rfps` },
        { "@type": "ListItem", position: 2, name: `Tenders in ${countryLabel}`, item: `${SITE_URL}/tenders/${cSlug}` },
        { "@type": "ListItem", position: 3, name: t.title, item: `${SITE_URL}${path}` },
      ],
    },
  ];

  return (
    <div className="container max-w-4xl py-16">
      <SEO title={title} rawTitle description={description} path={path} type="article" jsonLd={jsonLd} noindex={isThin(t)} />

      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/rfps" className="hover:text-accent">Tenders</Link> /{" "}
        <Link to={`/tenders/${cSlug}`} className="hover:text-accent">{countryLabel}</Link>
        {t.category && <> / <Link to={`/tenders/sector/${slugify(t.category)}`} className="hover:text-accent">{t.category}</Link></>}
      </nav>

      {t.is_award_notice ? (
        <div className="mb-6 rounded-md border border-border bg-muted px-4 py-3 text-sm">Contract award notice — this is a record of an awarded contract, not an open tender.</div>
      ) : !open ? (
        <div className="mb-6 rounded-md border border-border bg-muted px-4 py-3 text-sm">Closed on {fmtDate(t.deadline)}. See similar open tenders below.</div>
      ) : null}

      <h1 className="font-display text-3xl font-semibold tracking-tight">{t.title}</h1>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-5 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Buyer</dt><dd>{t.organization ?? "Not stated"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Country</dt><dd>{countryLabel}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Sector</dt><dd>{t.category ?? "Unclassified"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Deadline</dt><dd className="font-data">{fmtDate(t.deadline)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{t.is_award_notice ? "Award" : open ? (t.status === "closing_soon" ? "Closing soon" : "Open") : "Closed"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Recorded value</dt><dd className="font-data">{value ?? "Not stated"}</dd></div>
        <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">Source</dt><dd className="font-data">{t.portal}</dd></div>
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Scope of work</h2>
        <p className="mt-2 text-sm leading-relaxed">{t.description ?? "The source notice carries no summary beyond the title. Open the official notice for full details."}</p>
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Button asChild><a href={t.official_source_url || t.source_url} target="_blank" rel="noopener noreferrer nofollow">View official notice</a></Button>
        {(t.document_urls ?? []).slice(0, 5).map((d, i) => (
          <Button key={d} asChild variant="outline"><a href={d} target="_blank" rel="noopener noreferrer nofollow">Document {i + 1}</a></Button>
        ))}
      </section>

      <section className="mt-10 rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Analyse this tender</h2>
        <p className="mt-1 text-sm text-muted-foreground">Match score, win probability, gap analysis, tracking, alerts and Bid Studio drafting are available with an account.</p>
        <Button asChild className="mt-4" variant={user ? "default" : "outline"}>
          <Link to={user ? "/bid-studio/analyser" : "/auth"}>{user ? "Open Bid Studio" : "Sign in to analyse this tender"}</Link>
        </Button>
      </section>

      {related.similar.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Similar open tenders</h2>
          <ul className="mt-2">{related.similar.map((o) => <TenderRow key={o.id} t={o} />)}</ul>
        </section>
      )}
      {related.buyer.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Other notices from {t.organization}</h2>
          <ul className="mt-2">{related.buyer.map((o) => <TenderRow key={o.id} t={o} />)}</ul>
        </section>
      )}
    </div>
  );
};

export default TenderPage;
