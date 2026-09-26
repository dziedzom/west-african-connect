// Shared helpers for public tender pages, landing pages and sitemap paths.
// Keep slugify in sync with public.seo_slugify and supabase/functions/sitemap.

export const SITE_URL = "https://www.middlbrand.com";

export function slugify(t: string | null | undefined): string {
  const s = (t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return s || "tender";
}

export const shortIdOf = (id: string) => id.replace(/-/g, "").slice(0, 8);

/** Country segment. Unknown / multi-country listings live under "africa". */
export function countrySlug(location: string | null | undefined): string {
  const loc = (location ?? "").split(/[,;/(]/)[0].trim();
  if (!loc || /^(various|multiple|africa|regional|n\/?a)$/i.test(loc)) return "africa";
  return slugify(loc);
}

export function tenderPath(t: { id: string; title: string; location?: string | null; slug?: string | null }) {
  return `/tenders/${countrySlug(t.location)}/${t.slug || slugify(t.title)}-${shortIdOf(t.id)}`;
}

/** Sector landing groups. The marketing group bundles the five marketing labels. */
export const SECTOR_GROUPS: Record<string, { label: string; sectors: string[] }> = {
  "marketing-communications": {
    label: "Marketing and communications",
    sectors: ["Marketing", "Creative & Design", "Media & Advertising", "Events", "Communications"],
  },
};

export function sectorGroupFor(slug: string, allSectors: string[]) {
  if (SECTOR_GROUPS[slug]) return SECTOR_GROUPS[slug];
  const match = allSectors.find((s) => slugify(s) === slug);
  return match ? { label: match, sectors: [match] } : null;
}

export const LANDING_MIN_OPEN = 3;
export const LANDING_MIN_TOTAL = 5;

export interface PublicTender {
  id: string;
  short_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  category: string | null;
  location: string | null;
  organization: string | null;
  portal: string | null;
  status: string;
  value_amount: number | null;
  value_currency: string | null;
  is_award_notice: boolean;
  updated_at: string;
}

export const isOpen = (t: { status: string }) => t.status === "open" || t.status === "closing_soon";

/** Thin rows stay noindex until the document read fills them in. */
export const isThin = (t: { description: string | null; organization: string | null }) =>
  !t.organization || !t.description || t.description.trim().length < 40;

export function fmtDate(iso: string | null) {
  if (!iso) return "Not stated";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtValue(amount: number | null, currency: string | null) {
  if (amount == null || amount <= 0) return null;
  const n = amount >= 1e6 ? `${(amount / 1e6).toFixed(1)}M` : amount >= 1e3 ? `${(amount / 1e3).toFixed(1)}K` : amount.toFixed(0);
  return `${currency ?? ""} ${n}`.trim();
}
