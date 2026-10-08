import { useEffect } from "react";

interface SEOProps {
  title?: string;
  /** Use the title as-is, without appending the site name. */
  rawTitle?: boolean;
  description?: string;
  path?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const BASE_URL = "https://www.middlbrand.com";
const SITE_NAME = "MiddlBrand";
const DEFAULT_DESCRIPTION =
  "The bridge between high-growth companies and winning RFP contracts. Connecting vetted African businesses to real opportunities.";
// Signed-in, admin and auth screens are never indexed, whatever the page passes.
const PRIVATE_PATH = /^\/(admin|scrape|indexing|dashboard|profile|knowledge-base|proposals|verification|bid-studio|auth|forgot-password|reset-password)(\/|$)/;
const OG_IMAGE = `${BASE_URL}/og-image.png`;

const SEO = ({
  title,
  rawTitle = false,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  type = "website",
  jsonLd,
  noindex = false,
}: SEOProps) => {
  const fullTitle = title
    ? rawTitle ? title : `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — The Bridge to Winning RFP Contracts`;
  const canonicalUrl = `${BASE_URL}${path}`;

  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@middlbrand.com",
      contactType: "customer service",
    },
  };

  const ldKey = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    const blocked = noindex || PRIVATE_PATH.test(window.location.pathname);
    setMeta("name", "robots", blocked ? "noindex, follow" : "index, follow");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", OG_IMAGE);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:locale", "en_US");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@MiddlBrand");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", OG_IMAGE);

    const ldData = jsonLd || defaultJsonLd;
    let script = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ldData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, description, canonicalUrl, type, ldKey, noindex]);

  return null;
};

export default SEO;
