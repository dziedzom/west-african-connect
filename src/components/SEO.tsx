import { Helmet } from "react-helmet-async";

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

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@MiddlBrand" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEO;
