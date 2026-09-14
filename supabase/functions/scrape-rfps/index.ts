import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendScrapeAlert, detectAuthFailure } from "../_shared/scrape-alerts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API = "https://connector-gateway.lovable.dev/firecrawl/v1";
const BATCH_SIZE = 5;
const CLOSING_SOON_DAYS = 7;
const PORTAL_TIMEOUT_MS = 60_000;
// The gateway drops a request that has sent no bytes for 150s, so the whole
// invocation must return well before that. Stop starting new portals past this.
const TIME_BUDGET_MS = 115_000;
const PORTAL_SLEEP_MS = 1_000;
// Detail-page deep scraping guards.
const DETAIL_TIMEOUT_MS = 25_000;      // per detail page (fetch + extraction)
const DETAIL_SLEEP_MS = 1_500;         // spacing to respect Firecrawl per-minute limits
const DETAIL_TIME_RESERVE_MS = 20_000; // headroom kept for saving rows + cleanup
const PORTAL_TIMEOUT_DETAIL_MS = 100_000; // detail-enabled portals need more room
const AUTO_DISABLE_AFTER_FAILURES = 3;
const AUTO_DISABLE_DAYS = 7;

const AFRICAN_COUNTRIES = [
  "algeria","angola","benin","botswana","burkina faso","burundi","cameroon","cape verde","cabo verde",
  "central african republic","chad","comoros","congo","dr congo","democratic republic of the congo",
  "côte d'ivoire","cote d'ivoire","ivory coast","djibouti","egypt","equatorial guinea","eritrea","eswatini",
  "swaziland","ethiopia","gabon","gambia","ghana","guinea","guinea-bissau","kenya","lesotho",
  "liberia","libya","madagascar","malawi","mali","mauritania","mauritius","morocco","mozambique",
  "namibia","niger","nigeria","rwanda","são tomé and príncipe","sao tome and principe","senegal","seychelles",
  "sierra leone","somalia","south africa","south sudan","sudan","tanzania","togo","tunisia",
  "uganda","zambia","zimbabwe","africa","sahel",
];

const AFRICA_KEYWORDS = ["africa","african","sadc","ecowas","eac","comesa","igad","au commission","african union","afdb","afreximbank","uemoa","waemu","eccas"];

// Locations that carry no geographic signal — fall through to keyword matching.
const GENERIC_LOCATIONS = new Set([
  "","null","none","unknown","global","worldwide","world wide","multiple","multiple countries",
  "various","various countries","other","n/a","na","unspecified","home based","home-based",
  "remote","international","multi-country","tbd",
]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matchers: a bare `includes()` check leaked badly
// (e.g. "eac" matched "peace"/"each", "mali" matched "malicious").
const AFRICA_COUNTRY_RE = new RegExp(`(?:^|[^a-z])(?:${AFRICAN_COUNTRIES.map(escapeRe).join("|")})(?:[^a-z]|$)`, "i");
const AFRICA_KEYWORD_RE = new RegExp(`(?:^|[^a-z])(?:${AFRICA_KEYWORDS.map(escapeRe).join("|")})(?:[^a-z]|$)`, "i");

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Nothing is discarded at ingest for being near or past its deadline.
// Status is derived at insert time; display-time filtering decides visibility.
function deadlineStatus(deadlineStr: string | null): "open" | "closing_soon" | "expired" {
  if (!deadlineStr) return "open";
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return "open";
  const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays < CLOSING_SOON_DAYS) return "closing_soon";
  return "open";
}

function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildContentHash(rfp: { title?: string; organization?: string | null; deadline?: string | null; location?: string | null }): Promise<string> {
  const parts = [
    slugify(rfp.title || ""),
    slugify(rfp.organization || ""),
    (rfp.deadline || "").slice(0, 10),
    slugify(rfp.location || ""),
  ].join("|");
  return await sha256Hex(parts);
}

function isAfricaRelevant(
  rfp: {
    location?: string | null;
    organization?: string | null;
    description?: string | null;
    title?: string | null;
  },
  sourceCategory: string | null,
  sourceUrl?: string | null,
): boolean {
  // Sources that are Africa-only by definition.
  if (sourceCategory === "african_government" || sourceCategory === "regional_body") return true;
  // Africa-scoped aggregator feeds (e.g. .../global-africa-tenders.php). Only the
  // hostname + path counts: a query string such as `?searchString=africa` is a
  // keyword search on a global portal, not an Africa-only listing.
  if (sourceCategory === "aggregator") {
    try {
      const u = new URL(sourceUrl || "");
      if (`${u.hostname}${u.pathname}`.toLowerCase().includes("africa")) return true;
    } catch { /* unparseable URL — fall through to content checks */ }
  }

  const loc = (rfp.location || "").toLowerCase().trim();

  // An explicit location is authoritative: a tender located in the United States
  // is not Africa-relevant just because "Africa" appears somewhere in its text
  // (e.g. a keyword-filtered SAM.gov search page).
  if (!GENERIC_LOCATIONS.has(loc)) {
    return AFRICA_COUNTRY_RE.test(loc);
  }

  // No usable location — fall back to text signals.
  const haystack = `${rfp.organization || ""} ${rfp.title || ""} ${rfp.description || ""}`;
  return AFRICA_KEYWORD_RE.test(haystack) || AFRICA_COUNTRY_RE.test(haystack);
}

interface ScrapeSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  priority: number;
  enabled: boolean;
  auto_disabled_until: string | null;
  consecutive_failures: number;
  follow_detail_pages?: boolean;
  detail_link_pattern?: string | null;
  detail_max_per_run?: number | null;
}

interface PortalResult {
  portal: string;
  url: string;
  rfps_extracted?: number;
  rfps_found: number;
  skipped_expired: number;
  deduped: number;
  non_africa: number;
  open?: number;
  closing_soon?: number;
  expired?: number;
  null_deadline?: number;
  duration_ms?: number;
  detail_attempted?: number;
  detail_succeeded?: number;
  detail_failed?: number;
  detail_deadlines_recovered?: number;
  detail_skipped_for_time?: number;
  detail_ms?: number;
  error?: string;
}

/**
 * Generic detail-page deep scrape: fetch one opportunity's own page and ask the
 * model for the closing date only. Source-agnostic — behaviour is driven purely
 * by the scrape_sources config columns.
 */
async function fetchDetailDeadline(
  detailUrl: string,
  firecrawlKey: string,
  lovableKey: string,
  todayISO: string,
): Promise<string | null> {
  const res = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": firecrawlKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: detailUrl,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    if (detectAuthFailure(res.status, text)) {
      // Bubble up: a credential failure must not be swallowed as a per-item miss.
      throw new Error(`AUTH_FAILURE Firecrawl ${res.status}: ${text.slice(0, 300)}`);
    }
    throw new Error(`detail fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }

  let data: any = {};
  try { data = JSON.parse(text); } catch { data = {}; }
  const markdown: string = data.data?.markdown || data.markdown || "";
  if (!markdown || markdown.length < 80) throw new Error("detail page content too short");

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You read a single procurement opportunity page and report its closing date. Today is ${todayISO}.
STRICT, NO INFERENCE: return the closing/submission/due/bid-deadline date as ISO 8601 (YYYY-MM-DD) ONLY when it is explicitly written on this page for this opportunity. If no closing date is visible, return null. NEVER infer, estimate, guess, derive from context, or use a publication date or today's date. Null is a valid and expected outcome, not a failure.`,
        },
        { role: "user", content: `Page content:\n${markdown.substring(0, 12000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_deadline",
            description: "Report the explicitly visible closing date, or null.",
            parameters: {
              type: "object",
              properties: { deadline: { type: ["string", "null"] } },
              required: ["deadline"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_deadline" } },
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    if (detectAuthFailure(aiRes.status, errText)) {
      throw new Error(`AUTH_FAILURE AI gateway ${aiRes.status}: ${errText.slice(0, 300)}`);
    }
    throw new Error(`detail AI error (${aiRes.status})`);
  }

  const aiData = await aiRes.json();
  const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  let parsed: { deadline?: string | null } = {};
  try { parsed = JSON.parse(args); } catch { return null; }
  const d = parsed.deadline;
  if (!d || typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
  if (Number.isNaN(new Date(d).getTime())) return null;
  return d.substring(0, 10);
}

function isDetailCandidate(target: ScrapeSource, candidateUrl: string): boolean {
  if (!candidateUrl || !/^https?:\/\//i.test(candidateUrl)) return false;
  // Never re-fetch the listing page itself.
  if (candidateUrl.replace(/\/+$/, "") === target.url.replace(/\/+$/, "")) return false;
  const pattern = (target.detail_link_pattern || "").trim();
  if (!pattern) return true;
  try {
    return new RegExp(pattern, "i").test(candidateUrl);
  } catch {
    return candidateUrl.toLowerCase().includes(pattern.toLowerCase());
  }
}

async function scrapePortal(
  target: ScrapeSource,
  firecrawlKey: string,
  lovableKey: string,
  supabase: ReturnType<typeof createClient>,
  todayISO: string,
  runDeadlineMs: number = Date.now() + TIME_BUDGET_MS
): Promise<PortalResult> {
  console.log(`Scraping: ${target.name} - ${target.url}`);

  const scrapeRes = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: {
      // Gateway-backed Firecrawl connection: the connector key is a connection
      // key for the Lovable gateway, not a Firecrawl API key.
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": firecrawlKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: target.url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  });

  const scrapeText = await scrapeRes.text();
  let scrapeData: any = {};
  try { scrapeData = JSON.parse(scrapeText); } catch { scrapeData = {}; }
  if (!scrapeRes.ok) {
    const snippet = scrapeText.slice(0, 500);
    if (detectAuthFailure(scrapeRes.status, scrapeText)) {
      await sendScrapeAlert(supabase, {
        type: "auth_failure",
        key: `firecrawl-auth-${scrapeRes.status}`,
        severity: "critical",
        subject: `Scraper credential failure: Firecrawl returned ${scrapeRes.status}`,
        detail: `Firecrawl rejected the scrape request for "${target.name}" (${target.url}) with HTTP ${scrapeRes.status}.\n\nResponse: ${snippet}\n\nNo pages can be scraped until this credential is fixed.`,
      });
      throw new Error(`AUTH_FAILURE Firecrawl ${scrapeRes.status}: ${snippet}`);
    }
    throw new Error(`Firecrawl error: ${snippet}`);
  }

  const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
  const links = scrapeData.data?.links || scrapeData.links || [];

  if (!markdown || markdown.length < 100) {
    return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, deduped: 0, non_africa: 0, error: "Page content too short or empty" };
  }

  const truncatedContent = markdown.substring(0, 15000);

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting RFP (Request for Proposal) and tender opportunities from procurement portal content.

CRITICAL RULES:
1. Extract every distinct RFP/tender on the page. Do not invent fields.
2. **TRANSLATE everything to English.** All extracted fields must be in English.
3. **Deadlines — STRICT, NO INFERENCE**: Today is ${todayISO}.
   - Convert a deadline to ISO 8601 (YYYY-MM-DD) ONLY when a closing/submission/due date is explicitly visible in the supplied content for that specific opportunity.
   - If no closing date is visible for an item, you MUST return null for the deadline field (omit it). NEVER infer, estimate, guess, approximate, derive from context, or copy a date from another item, a publication date, or today's date.
   - A null deadline is a valid and expected outcome, NOT a failure. Returning null is always correct when the date is not shown. Fabricating a date is a critical error.
   - Include EVERY opportunity you find regardless of how soon it closes, including ones closing today, in a few days, or already past. Do not filter or skip by date.
4. For category, use: IT, Construction, Consulting, Agriculture, Energy, Health, Education, Transport, Marketing, Environment, Finance, Water, Legal, Mining, Pharma, Telecommunications, Other.
5. For location, give the country name in English. Use "Africa" or a regional label (e.g. "Sub-Saharan Africa") if multi-country.
6. For source_url, pick the most specific link from the links list; if none match, use the portal URL.

Return ONLY valid JSON via the function call.`,
        },
        {
          role: "user",
          content: `Extract ALL RFP/tender opportunities from this procurement portal (${target.name}), regardless of deadline proximity. Only give a deadline when one is literally visible in the content below; otherwise return null. Links found on page: ${JSON.stringify(links.slice(0, 40))}\n\nContent:\n${truncatedContent}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_rfps",
            description: "Extract RFP/tender opportunities from procurement portal content",
            parameters: {
              type: "object",
              properties: {
                rfps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      deadline: { type: "string" },
                      category: { type: "string" },
                      budget: { type: "string" },
                      location: { type: "string" },
                      organization: { type: "string" },
                      source_url: { type: "string" },
                    },
                    required: ["title", "source_url"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["rfps"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_rfps" } },
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    if (aiRes.status === 429) {
      return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, deduped: 0, non_africa: 0, error: "AI rate limited" };
    }
    if (detectAuthFailure(aiRes.status, errText)) {
      await sendScrapeAlert(supabase, {
        type: "auth_failure",
        key: `ai-gateway-auth-${aiRes.status}`,
        severity: "critical",
        subject: `Scraper credential failure: AI gateway returned ${aiRes.status}`,
        detail: `The AI extraction call for "${target.name}" was rejected with HTTP ${aiRes.status}.\n\nResponse: ${errText.slice(0, 500)}\n\nNo opportunities can be extracted until this is fixed.`,
      });
      throw new Error(`AUTH_FAILURE AI gateway ${aiRes.status}: ${errText.slice(0, 500)}`);
    }
    throw new Error(`AI gateway error (${aiRes.status}): ${errText.slice(0, 500)}`);
  }

  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, deduped: 0, non_africa: 0, error: "AI returned no structured data" };
  }

  let extracted: { rfps?: Array<Record<string, string>> } = {};
  try {
    extracted = JSON.parse(toolCall.function.arguments);
  } catch (e) {
    return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, deduped: 0, non_africa: 0, error: "Failed to parse AI JSON" };
  }
  const rfps = extracted.rfps || [];

  let insertedCount = 0;
  const skippedExpired = 0; // no longer used: nothing is skipped at ingest
  let dedupedCount = 0;
  let nonAfricaCount = 0;
  let nullDeadlineCount = 0;
  const statusCounts: Record<"open" | "closing_soon" | "expired", number> = { open: 0, closing_soon: 0, expired: 0 };

  // ---- Detail-page deep scraping (generic, config-driven) ----
  const detailEnabled = !!target.follow_detail_pages;
  const detailCap = Math.max(0, target.detail_max_per_run ?? 5);
  // Reserve headroom so detail fetches never push the batch past the ceiling.
  const detailDeadlineMs = runDeadlineMs - DETAIL_TIME_RESERVE_MS;
  let detailAttempted = 0;
  let detailSucceeded = 0;
  let detailFailed = 0;
  let detailRecovered = 0;
  let detailSkippedForTime = 0;
  let detailMs = 0;

  for (const rfp of rfps) {
    if (!rfp.title || !rfp.source_url) continue;

    if (detailEnabled && !rfp.deadline && isDetailCandidate(target, rfp.source_url)) {
      if (detailAttempted >= detailCap) {
        detailSkippedForTime++;
      } else if (Date.now() > detailDeadlineMs) {
        detailSkippedForTime++;
      } else {
        detailAttempted++;
        const startedAt = Date.now();
        try {
          const recovered = await withTimeout(
            fetchDetailDeadline(rfp.source_url, firecrawlKey, lovableKey, todayISO),
            DETAIL_TIMEOUT_MS,
          );
          detailSucceeded++;
          if (recovered) {
            rfp.deadline = recovered;
            detailRecovered++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Credential failures must abort the portal; per-item misses must not.
          if (msg.startsWith("AUTH_FAILURE")) throw e;
          detailFailed++;
          console.log(`${target.name}: detail fetch failed for ${rfp.source_url}: ${msg}`);
        }
        detailMs += Date.now() - startedAt;
        await new Promise((r) => setTimeout(r, DETAIL_SLEEP_MS));
      }
    }

    const rowStatus = deadlineStatus(rfp.deadline || null);





    // Africa relevance is enforced at ingest: non-relevant tenders are not saved at all.
    const africaRelevant = isAfricaRelevant(rfp, target.category, target.url);
    if (!africaRelevant) {
      nonAfricaCount++;
      continue;
    }

    const contentHash = await buildContentHash(rfp);
    const sourceDomain = extractDomain(rfp.source_url) || target.domain;

    // Dedup: if hash exists, append source_url to additional_source_urls
    const { data: existing } = await supabase
      .from("scraped_rfps")
      .select("id, source_url, additional_source_urls")
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (existing) {
      const current = (existing as { source_url: string; additional_source_urls: string[] | null });
      const extras = new Set([...(current.additional_source_urls || [])]);
      if (rfp.source_url !== current.source_url) extras.add(rfp.source_url);
      await supabase
        .from("scraped_rfps")
        .update({ additional_source_urls: Array.from(extras), updated_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id);
      dedupedCount++;
      continue;
    }

    // Some portals (e.g. table-based government listings) give every item the same
    // listing URL. Upserting on source_url would collapse them into a single row,
    // so give each distinct opportunity its own URL fragment.
    let rowSourceUrl = rfp.source_url;
    const { data: sameUrl } = await supabase
      .from("scraped_rfps")
      .select("id, content_hash")
      .eq("source_url", rowSourceUrl)
      .maybeSingle();
    if (sameUrl && (sameUrl as { content_hash: string | null }).content_hash !== contentHash) {
      rowSourceUrl = `${rfp.source_url.split("#")[0]}#${contentHash.slice(0, 10)}`;
    }



    const { error: upsertError } = await supabase.from("scraped_rfps").upsert(
      {
        title: rfp.title.substring(0, 500),
        description: rfp.description?.substring(0, 2000) || null,
        deadline: rfp.deadline || null,
        category: rfp.category || null,
        budget: rfp.budget || null,
        location: rfp.location || null,
        organization: rfp.organization || null,
        source_url: rowSourceUrl,
        portal: target.name,
        status: rowStatus,
        needs_review: !rfp.deadline,
        scraped_at: new Date().toISOString(),
        source_category: target.category,
        source_domain: sourceDomain,
        source_priority: target.priority,
        africa_relevant: africaRelevant,
        content_hash: contentHash,
      },
      { onConflict: "source_url" }
    );

    if (!upsertError) {
      insertedCount++;
      if (!rfp.deadline) nullDeadlineCount++;
      else statusCounts[rowStatus]++;
    } else console.error(`Upsert error for "${rfp.title}":`, upsertError.message);
  }

  console.log(`${target.name}: extracted ${rfps.length}, inserted ${insertedCount}, deduped ${dedupedCount}, non-africa ${nonAfricaCount}, open ${statusCounts.open}, closing_soon ${statusCounts.closing_soon}, expired ${statusCounts.expired}, null_deadline ${nullDeadlineCount}, detail attempted ${detailAttempted}, detail ok ${detailSucceeded}, detail failed ${detailFailed}, deadlines recovered ${detailRecovered}, detail ms ${detailMs}`);
  return {
    portal: target.name, url: target.url,
    rfps_extracted: rfps.length,
    rfps_found: insertedCount,
    skipped_expired: skippedExpired,
    deduped: dedupedCount,
    non_africa: nonAfricaCount,
    open: statusCounts.open,
    closing_soon: statusCounts.closing_soon,
    expired: statusCounts.expired,
    null_deadline: nullDeadlineCount,
    detail_attempted: detailAttempted,
    detail_succeeded: detailSucceeded,
    detail_failed: detailFailed,
    detail_deadlines_recovered: detailRecovered,
    detail_skipped_for_time: detailSkippedForTime,
    detail_ms: detailMs,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Portal timeout after ${ms}ms`)), ms) as unknown as number;
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // AuthZ: allow internal cron calls (shared secret), service-role calls, OR authenticated admin users.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isServiceRoleCall = !!bearer && bearer === SUPABASE_SERVICE_ROLE_KEY;
    const CRON_SECRET = Deno.env.get("SCRAPE_CRON_SECRET") || "";
    const cronHeader = (req.headers.get("x-cron-secret") || "").trim();
    const isCronCall = !!CRON_SECRET && !!cronHeader && cronHeader === CRON_SECRET;

    if (!isServiceRoleCall && !isCronCall) {
      if (!bearer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: claimsData, error: claimsError } = await authedClient.auth.getClaims(bearer);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: roleRow } = await adminCheck
        .from("user_roles").select("role")
        .eq("user_id", claimsData.claims.sub).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    // Validate & bound custom URLs (must be http/https, max 50) to prevent SSRF-via-proxy abuse.
    const customUrls: string[] = (Array.isArray(body.urls) ? body.urls : [])
      .filter((u: unknown): u is string => typeof u === "string")
      .map((u: string) => u.trim())
      .filter((u: string) => { try { const p = new URL(u); return p.protocol === "http:" || p.protocol === "https:"; } catch { return false; } })
      .slice(0, 50);
    const portalFilter: string[] = body.portals || [];
    const sourceDomain: string | undefined = body.source_domain;
    const priorityFilter: number | null = typeof body.priority === "number" ? body.priority : null;
    const batch: number | null = typeof body.batch === "number" ? body.batch : null;
    const batchSize: number = body.batch_size || BATCH_SIZE;

    // Backfill mode: re-run detail-page extraction over rows that were saved
    // without a deadline, for sources configured to follow detail pages.
    if (body.backfill_details === true) {
      const bfStart = Date.now();
      const { data: bfSources } = await supabase
        .from("scrape_sources")
        .select("*")
        .eq("follow_detail_pages", true);
      let bfTargets = (bfSources as ScrapeSource[]) || [];
      if (portalFilter.length > 0) bfTargets = bfTargets.filter((s) => portalFilter.includes(s.name));

      const perSource: Array<Record<string, unknown>> = [];
      for (const target of bfTargets) {
        const cap = Math.max(0, target.detail_max_per_run ?? 5);
        const { data: rows } = await supabase
          .from("scraped_rfps")
          .select("id, source_url")
          .eq("portal", target.name)
          .is("deadline", null)
          .limit(cap);
        let attempted = 0, succeeded = 0, failed = 0, recovered = 0, skippedTime = 0;
        for (const row of (rows as Array<{ id: string; source_url: string }>) || []) {
          if (Date.now() - bfStart > TIME_BUDGET_MS - DETAIL_TIME_RESERVE_MS) { skippedTime++; continue; }
          if (!isDetailCandidate(target, row.source_url)) continue;
          attempted++;
          try {
            const deadline = await withTimeout(
              fetchDetailDeadline(row.source_url, FIRECRAWL_API_KEY, LOVABLE_API_KEY, new Date().toISOString().split("T")[0]),
              DETAIL_TIMEOUT_MS,
            );
            succeeded++;
            if (deadline) {
              await supabase.from("scraped_rfps").update({
                deadline,
                status: deadlineStatus(deadline),
                needs_review: false,
                updated_at: new Date().toISOString(),
              }).eq("id", row.id);
              recovered++;
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.startsWith("AUTH_FAILURE")) throw e;
            failed++;
            console.log(`${target.name}: backfill detail fetch failed for ${row.source_url}: ${msg}`);
          }
          await new Promise((r) => setTimeout(r, DETAIL_SLEEP_MS));
        }
        perSource.push({
          portal: target.name, detail_attempted: attempted, detail_succeeded: succeeded,
          detail_failed: failed, detail_deadlines_recovered: recovered, detail_skipped_for_time: skippedTime,
        });
      }

      return new Response(JSON.stringify({
        success: true, mode: "backfill_details",
        total_duration_ms: Date.now() - bfStart,
        sources: perSource,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const includeDisabled: boolean = !!body.include_disabled;

    // Load source catalog from DB
    // Stable ordering is required so batch slices never overlap or skip sources.
    let q = supabase.from("scrape_sources").select("*").eq("enabled", true).order("priority", { ascending: true }).order("id", { ascending: true });
    if (priorityFilter !== null) q = q.eq("priority", priorityFilter);
    if (sourceDomain) q = q.eq("domain", sourceDomain);
    if (portalFilter.length > 0) q = q.in("name", portalFilter);
    const { data: sourcesData, error: sourcesErr } = await q;
    if (sourcesErr) throw new Error(`Failed to load scrape_sources: ${sourcesErr.message}`);

    const nowISO = new Date().toISOString();
    let targets: ScrapeSource[] = ((sourcesData as ScrapeSource[]) || []).filter(
      (s) => includeDisabled || !s.auto_disabled_until || s.auto_disabled_until < nowISO
    );

    // Custom URLs (one-off, not stored as sources)
    for (const url of customUrls) {
      targets.push({
        id: "custom", name: "Custom", url, domain: extractDomain(url),
        category: "other", priority: 2, enabled: true, auto_disabled_until: null, consecutive_failures: 0,
      });
    }

    const totalBatches = Math.ceil(targets.length / batchSize);
    if (batch !== null) {
      const start = batch * batchSize;
      targets = targets.slice(start, start + batchSize);
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No targets matched filter", batch, totalBatches, results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const todayISO = new Date().toISOString().split("T")[0];
    const results: PortalResult[] = [];
    const runStartTs = Date.now();
    const skippedForTime: string[] = [];

    for (const target of targets) {
      const startTs = Date.now();
      // Never start a portal that could push the response past the gateway idle timeout.
      if (Date.now() - runStartTs > TIME_BUDGET_MS) {
        skippedForTime.push(target.name);
        continue;
      }
      try {
        const runDeadlineMs = runStartTs + TIME_BUDGET_MS;
        const result = await withTimeout(
          scrapePortal(target, FIRECRAWL_API_KEY, LOVABLE_API_KEY, supabase, todayISO, runDeadlineMs),
          target.follow_detail_pages ? PORTAL_TIMEOUT_DETAIL_MS : PORTAL_TIMEOUT_MS
        );
        results.push({ ...result, duration_ms: Date.now() - startTs });

        // Update source health on success
        if (target.id !== "custom") {
          await supabase.from("scrape_sources").update({
            last_run_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            last_error: null,
            consecutive_failures: 0,
            auto_disabled_until: null,
            total_runs: (await supabase.from("scrape_sources").select("total_runs, successful_runs").eq("id", target.id).single()).data?.total_runs as number + 1 || 1,
            successful_runs: (await supabase.from("scrape_sources").select("successful_runs").eq("id", target.id).single()).data?.successful_runs as number + 1 || 1,
          }).eq("id", target.id);
        }
      } catch (portalError: unknown) {
        const msg = portalError instanceof Error ? portalError.message : "Unknown error";
        console.error(`Error scraping ${target.name}:`, msg);
        results.push({ portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, deduped: 0, non_africa: 0, duration_ms: Date.now() - startTs, error: msg });

        if (target.id !== "custom") {
          const newFailures = (target.consecutive_failures || 0) + 1;
          const autoDisable = newFailures >= AUTO_DISABLE_AFTER_FAILURES
            ? new Date(Date.now() + AUTO_DISABLE_DAYS * 86400_000).toISOString()
            : null;
          await supabase.from("scrape_sources").update({
            last_run_at: new Date().toISOString(),
            last_error: msg.slice(0, 500),
            consecutive_failures: newFailures,
            auto_disabled_until: autoDisable,
            total_runs: (await supabase.from("scrape_sources").select("total_runs").eq("id", target.id).single()).data?.total_runs as number + 1 || 1,
          }).eq("id", target.id);

          // Log to agent_logs (system user_id = service role uses zero-uuid; skip if blocked by FK)
          await supabase.from("agent_logs").insert({
            user_id: "00000000-0000-0000-0000-000000000000",
            task_id: `scrape-${target.id}-${Date.now()}`,
            target_url: target.url,
            status: autoDisable ? "auto_disabled" : "failed",
            error_message: msg.slice(0, 500),
          }).then(() => {}, () => {});

          if (autoDisable) {
            await sendScrapeAlert(supabase, {
              type: "source_auto_disabled",
              key: `auto-disabled-${target.id}`,
              severity: "critical",
              subject: `Source auto-disabled: ${target.name}`,
              detail: `"${target.name}" (${target.url}) has been switched off after ${newFailures} consecutive failures and stays off until ${autoDisable}.\n\nReason (last error): ${msg.slice(0, 500)}`,
            });
          }
        }
      }

      console.log(`Portal ${target.name} took ${Date.now() - startTs}ms`);
      await new Promise((r) => setTimeout(r, PORTAL_SLEEP_MS));
    }

    // Status maintenance (last batch / single-batch only): nothing is deleted.
    // Past-deadline rows become 'expired'; rows now within 7 days become 'closing_soon'.
    let expiredCount = 0;
    let closingSoonCount = 0;
    const isLastBatch = batch === null || batch >= totalBatches - 1;
    if (isLastBatch) {
      const nowIso = new Date().toISOString();
      const soonIso = new Date(Date.now() + CLOSING_SOON_DAYS * 86400_000).toISOString();
      const { count: expCount } = await supabase
        .from("scraped_rfps")
        .update({ status: "expired" }, { count: "exact" })
        .neq("status", "expired")
        .not("deadline", "is", null)
        .lt("deadline", nowIso);
      expiredCount = expCount || 0;

      const { count: soonCount } = await supabase
        .from("scraped_rfps")
        .update({ status: "closing_soon" }, { count: "exact" })
        .eq("status", "open")
        .not("deadline", "is", null)
        .gte("deadline", nowIso)
        .lt("deadline", soonIso);
      closingSoonCount = soonCount || 0;
    }

    const sum = (k: keyof PortalResult) => results.reduce((s, r) => s + ((r[k] as number) || 0), 0);

    const payload = {
      success: true, batch, totalBatches,
      portals_processed: results.length,
      portals_skipped_for_time: skippedForTime,
      total_duration_ms: Date.now() - runStartTs,
      slowest_portal_ms: results.reduce((m, r) => Math.max(m, r.duration_ms || 0), 0),
      total_rfps_extracted: sum("rfps_extracted"),
      total_rfps_found: sum("rfps_found"),
      total_skipped_expired: 0,
      total_deduped: sum("deduped"),
      total_open: sum("open"),
      total_closing_soon: sum("closing_soon"),
      total_expired: sum("expired"),
      total_null_deadline: sum("null_deadline"),
      detail_fetches_attempted: sum("detail_attempted"),
      detail_fetches_succeeded: sum("detail_succeeded"),
      detail_fetches_failed: sum("detail_failed"),
      detail_deadlines_recovered: sum("detail_deadlines_recovered"),
      detail_skipped_for_time: sum("detail_skipped_for_time"),
      detail_total_ms: sum("detail_ms"),
      transitioned_expired: expiredCount,
      transitioned_closing_soon: closingSoonCount,
      results,
    };

    // Run history: the real outcome of this invocation, independent of pg_cron status.
    const failedResults = results.filter((r) => r.error);
    const authFailed = failedResults.some((r) => (r.error || "").includes("AUTH_FAILURE"));
    await supabase.from("scrape_run_log").insert({
      invoked_by: req.headers.get("x-cron-secret") ? "cron" : "manual",
      batch,
      batch_size: batchSize,
      http_status: 200,
      ok: true,
      portals_processed: results.length,
      portals_failed: failedResults.length,
      rows_saved: payload.total_rfps_found,
      duration_ms: payload.total_duration_ms,
      auth_failure: authFailed,
      error_summary: failedResults.map((r) => `${r.portal}: ${r.error}`).join(" | ").slice(0, 2000) || null,
      response_body: payload,
    }).then(() => {}, () => {});

    return new Response(JSON.stringify(payload),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("scrape-rfps error:", message);
    try {
      const logger = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await logger.from("scrape_run_log").insert({
        invoked_by: req.headers.get("x-cron-secret") ? "cron" : "manual",
        http_status: 500,
        ok: false,
        auth_failure: message.includes("AUTH_FAILURE"),
        error_summary: message.slice(0, 2000),
      });
    } catch { /* logging must never mask the original failure */ }
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
