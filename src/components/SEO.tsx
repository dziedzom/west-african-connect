import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = "https://middlbrand.com";
const SITE_NAME = "MiddlBrand";
const DEFAULT_DESCRIPTION =
  "The bridge between high-growth companies and winning RFP contracts. Connecting vetted West African businesses to real opportunities.";
const OG_IMAGE = `${BASE_URL}/og-image.png`;

const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  type = "website",
  jsonLd,
}: SEOProps) => {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — The Bridge to Winning RFP Contracts`;
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

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Description
    setMeta("name", "description", description);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // Open Graph
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", OG_IMAGE);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:locale", "en_US");

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@MiddlBrand");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", OG_IMAGE);

    // JSON-LD
    const ldData = jsonLd || defaultJsonLd;
    let script = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ldData);
  }, [fullTitle, description, canonicalUrl, type, jsonLd]);

  return null;
};

export default SEO;
