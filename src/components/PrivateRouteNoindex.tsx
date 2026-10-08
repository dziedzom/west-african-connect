import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Signed-in, admin and auth screens must never be indexed. Public pages set robots via <SEO />.
const PRIVATE = /^\/(admin|scrape|indexing|dashboard|profile|knowledge-base|proposals|verification|bid-studio|auth|forgot-password|reset-password)(\/|$)/;

const PrivateRouteNoindex = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!PRIVATE.test(pathname)) return;
    let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
  }, [pathname]);
  return null;
};

export default PrivateRouteNoindex;
