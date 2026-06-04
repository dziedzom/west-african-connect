import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function gscFetch(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")!;
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`GSC ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin-only
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!bearer) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
    const { data: claimsData, error: claimsError } = await authed.auth.getClaims(bearer);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role")
      .eq("user_id", claimsData.claims.sub).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "overview";

    if (action === "sites") {
      const data = await gscFetch("/webmasters/v3/sites");
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "overview") {
      const siteUrl: string = body.siteUrl;
      if (!siteUrl) throw new Error("siteUrl required");
      const enc = encodeURIComponent(siteUrl);

      // Sitemaps: gives lastSubmitted, errors, warnings, isPending, contents
      const sitemaps = await gscFetch(`/webmasters/v3/sites/${enc}/sitemaps`).catch((e) => ({ error: String(e) }));

      // URL inspection on the homepage for last crawl time + index status
      const inspectUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
      let inspection: any = null;
      try {
        inspection = await gscFetch(`/v1/urlInspection/index:inspect`, {
          method: "POST",
          body: JSON.stringify({ inspectionUrl: inspectUrl, siteUrl }),
        });
      } catch (e) {
        inspection = { error: String(e) };
      }

      return new Response(JSON.stringify({ sitemaps, inspection }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "inspect") {
      const siteUrl: string = body.siteUrl;
      const inspectionUrl: string = body.url;
      if (!siteUrl || !inspectionUrl) throw new Error("siteUrl and url required");
      const data = await gscFetch(`/v1/urlInspection/index:inspect`, {
        method: "POST",
        body: JSON.stringify({ inspectionUrl, siteUrl }),
      });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gsc-indexing error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
