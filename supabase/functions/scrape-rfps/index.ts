import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const AUTO_DISABLE_AFTER_FAILURES = 3;
const AUTO_DISABLE_DAYS = 7;

const AFRICAN_COUNTRIES = new Set([
  "algeria","angola","benin","botswana","burkina faso","burundi","cameroon","cape verde",
  "central african republic","chad","comoros","congo","dr congo","democratic republic of the congo",
  "côte d'ivoire","cote d'ivoire","ivory coast","djibouti","egypt","equatorial guinea","eritrea","eswatini",
  "swaziland","ethiopia","gabon","gambia","ghana","guinea","guinea-bissau","kenya","lesotho",
  "liberia","libya","madagascar","malawi","mali","mauritania","mauritius","morocco","mozambique",
  "namibia","niger","nigeria","rwanda","são tomé and príncipe","sao tome and principe","senegal","seychelles",
  "sierra leone","somalia","south africa","south sudan","sudan","tanzania","togo","tunisia",
  "uganda","zambia","zimbabwe","africa","sub-saharan africa","sub saharan africa","east africa","west africa","north africa","southern africa","central africa",
]);

const AFRICA_KEYWORDS = ["africa","african","sadc","ecowas","eac","comesa","au commission","african union","afdb","afreximbank"];

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

function isAfricaRelevant(rfp: {
  location?: string | null;
  organization?: string | null;
  description?: string | null;
  title?: string | null;
}, sourceCategory: string | null): boolean {
  if (sourceCategory === "african_government" || sourceCategory === "regional_body") return true;

  const loc = (rfp.location || "").toLowerCase().trim();
  if (loc && AFRICAN_COUNTRIES.has(loc)) return true;
  for (const c of AFRICAN_COUNTRIES) {
    if (loc.includes(c)) return true;
  }

  const haystack = `${rfp.organization || ""} ${rfp.title || ""} ${rfp.description || ""}`.toLowerCase();
  if (AFRICA_KEYWORDS.some((k) => haystack.includes(k))) return true;
  for (const c of AFRICAN_COUNTRIES) {
    if (haystack.includes(c)) return true;
  }
  return false;
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
  error?: string;
}

async function scrapePortal(
  target: ScrapeSource,
  firecrawlKey: string,
  lovableKey: string,
  supabase: ReturnType<typeof createClient>,
  todayISO: string
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

  for (const rfp of rfps) {
    if (!rfp.title || !rfp.source_url) continue;

    const rowStatus = deadlineStatus(rfp.deadline || null);



    const africaRelevant = isAfricaRelevant(rfp, target.category);
    if (!africaRelevant) nonAfricaCount++;

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

    const { error: upsertError } = await supabase.from("scraped_rfps").upsert(
      {
        title: rfp.title.substring(0, 500),
        description: rfp.description?.substring(0, 2000) || null,
        deadline: rfp.deadline || null,
        category: rfp.category || null,
        budget: rfp.budget || null,
        location: rfp.location || null,
        organization: rfp.organization || null,
        source_url: rfp.source_url,
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

  console.log(`${target.name}: extracted ${rfps.length}, inserted ${insertedCount}, deduped ${dedupedCount}, non-africa ${nonAfricaCount}, open ${statusCounts.open}, closing_soon ${statusCounts.closing_soon}, expired ${statusCounts.expired}, null_deadline ${nullDeadlineCount}`);
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
        const result = await withTimeout(
          scrapePortal(target, FIRECRAWL_API_KEY, LOVABLE_API_KEY, supabase, todayISO),
          PORTAL_TIMEOUT_MS
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

    return new Response(JSON.stringify({
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
      transitioned_expired: expiredCount,
      transitioned_closing_soon: closingSoonCount,
      results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("scrape-rfps error:", message);
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
