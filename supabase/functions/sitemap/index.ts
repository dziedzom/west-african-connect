// Live sitemap: marketing pages, indexable landing pages and every non-thin tender page.
// Referenced from public/robots.txt. Path/slug logic mirrors src/lib/tenderSeo.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://www.middlbrand.com";
const MIN_OPEN = 3;
const MIN_TOTAL = 5;
const MARKETING = ["Marketing", "Creative & Design", "Media & Advertising", "Events", "Communications"];

function slugify(t: string | null | undefined) {
  const s = (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/['’]/g, " ").replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-+|-+$/g, "");
  return s || "tender";
}
function countrySlug(loc: string | null) {
  const l = (loc ?? "").split(/[,;/(]/)[0].trim();
  if (!l || /^(various|multiple|africa|regional|n\/?a)$/i.test(l)) return "africa";
  return slugify(l);
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

interface Row {
  id: string; short_id: string; slug: string | null; title: string; description: string | null;
  location: string | null; organization: string | null; category: string | null; status: string;
  is_award_notice: boolean; updated_at: string;
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  // The API returns at most 1,000 rows per request, so read in pages.
  const PAGE = 1000;
  const rows: Row[] = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await sb.rpc("list_public_tenders", { _limit: 20000 }).range(from, from + PAGE - 1);
    if (error) return new Response("sitemap unavailable", { status: 500 });
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const urls: { loc: string; lastmod?: string }[] = [
    "/", "/rfps", "/pricing", "/join", "/partnerships", "/about", "/contact",
  ].map((p) => ({ loc: SITE + p }));

  const groups = new Map<string, { open: number; total: number; last: string }>();
  const bump = (key: string, r: Row) => {
    const g = groups.get(key) ?? { open: 0, total: 0, last: "" };
    g.total++;
    if ((r.status === "open" || r.status === "closing_soon") && !r.is_award_notice) g.open++;
    if (r.updated_at > g.last) g.last = r.updated_at;
    groups.set(key, g);
  };

  for (const r of rows) {
    bump(`/tenders/${countrySlug(r.location)}`, r);
    if (r.category) bump(`/tenders/sector/${slugify(r.category)}`, r);
    if (r.category && MARKETING.includes(r.category)) bump("/tenders/sector/marketing-communications", r);
    const thin = !r.organization || !r.description || r.description.trim().length < 40;
    if (thin) continue;
    urls.push({
      loc: `${SITE}/tenders/${countrySlug(r.location)}/${r.slug || slugify(r.title)}-${r.short_id}`,
      lastmod: r.updated_at.slice(0, 10),
    });
  }
  for (const [p, g] of groups) {
    if (g.open >= MIN_OPEN && g.total >= MIN_TOTAL) urls.push({ loc: SITE + p, lastmod: g.last.slice(0, 10) });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")
  }\n</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});
