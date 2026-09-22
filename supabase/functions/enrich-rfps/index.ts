// Deep-read enrichment pass.
// Opens each opportunity's own page and its attached tender documents, and records
// ONLY what is literally written there: contract value (+ currency and what the
// figure represents), closing date, the official notice URL and the document links.
// Nothing is inferred. Null is always a valid outcome.
//
// This runs separately from scrape-rfps: no scraping, filtering, /try, Bid Studio
// or Pro logic is touched.
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendScrapeAlert, detectAuthFailure } from "../_shared/scrape-alerts.ts";
import { cleanTextField } from "../_shared/clean-field.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_API = "https://connector-gateway.lovable.dev/firecrawl/v1";
const AI_API = "https://ai.gateway.lovable.dev/v1/chat/completions";

const BATCH_SIZE = 8;              // fixed work bound per run
const MAX_DOCS_PER_ROW = 2;        // tender documents read per opportunity
const TIME_BUDGET_MS = 110_000;    // stop starting new work past this
const PAGE_TIMEOUT_MS = 30_000;
const DOC_TIMEOUT_MS = 35_000;
const AI_TIMEOUT_MS = 40_000;
const ITEM_SLEEP_MS = 800;
const LEASE_MINUTES = 5;
const MAX_ATTEMPTS = 3;            // then the row is parked
const MAX_RATE_LIMIT_HITS = 3;

const DOC_RE = /\.(pdf|docx?|xlsx?|rtf|zip)(\?|#|$)/i;
// Endpoints that serve tender documents without a file extension in the URL.
const DOC_ENDPOINT_RE = /(download|attachment|getfile|filedownload|docdownload|viewdocument)/i;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function normalizeDeadline(d: string | null | undefined): string | null {
  if (!d) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T23:59:59Z` : d;
}

function deadlineStatus(d: string | null): "open" | "closing_soon" | "expired" {
  if (!d) return "open";
  const t = new Date(d);
  if (isNaN(t.getTime())) return "open";
  const days = (t.getTime() - Date.now()) / 86400_000;
  if (days < 0) return "expired";
  if (days < 7) return "closing_soon";
  return "open";
}

function formatValue(amount: number, currency: string): string {
  const c = (currency || "USD").toUpperCase();
  const abs = Math.abs(amount);
  const short = abs >= 1_000_000
    ? `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
    : abs >= 1_000
      ? `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`
      : `${amount}`;
  return `${c} ${short}`;
}

/** A gateway/AI failure the whole job must stop on (credits, policy, credentials). */
class HaltError extends Error {
  constructor(message: string, readonly reason: string) {
    super(message);
  }
}
class RateLimited extends Error {}

// Firecrawl's per-minute quota is shared with the portal scraper and search
// discovery, so document reads are paced and rate limits retried with backoff.
const FIRECRAWL_MIN_GAP_MS = 6_500;
const FIRECRAWL_RATE_RETRIES = 2;
let lastFirecrawlAt = 0;

function retryAfterMs(bodyText: string, header: string | null): number {
  const fromHeader = header ? Number(header) : NaN;
  if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.min(fromHeader * 1000, 30_000);
  const m = /retry after (\d+)s/i.exec(bodyText || "");
  if (m) return Math.min(Number(m[1]) * 1000, 30_000);
  return 8_000;
}

async function firecrawlMarkdown(
  url: string,
  firecrawlKey: string,
  lovableKey: string,
  wantLinks: boolean,
  timeoutMs: number,
): Promise<{ markdown: string; links: string[] }> {
  let res!: Response;
  let text = "";

  for (let attempt = 0; ; attempt++) {
    const wait = lastFirecrawlAt + FIRECRAWL_MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastFirecrawlAt = Date.now();

    res = await withTimeout(
      fetch(`${FIRECRAWL_API}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": firecrawlKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: wantLinks ? ["markdown", "links"] : ["markdown"],
          onlyMainContent: false,
          timeout: 25_000,
        }),
      }),
      timeoutMs,
      "firecrawl",
    );

    text = await res.text();
    const rateLimited = res.status === 429 || (!res.ok && /rate limit/i.test(text));
    if (rateLimited && attempt < FIRECRAWL_RATE_RETRIES) {
      await new Promise((r) => setTimeout(r, retryAfterMs(text, res.headers.get("retry-after")) * (attempt + 1)));
      continue;
    }
    break;
  }

  if (!res.ok) {
    if (detectAuthFailure(res.status, text)) {
      throw new HaltError(`Firecrawl credential refused (${res.status}): ${text.slice(0, 200)}`, "firecrawl_auth");
    }
    if (res.status === 429 || /rate limit/i.test(text)) throw new RateLimited(`Firecrawl rate limited`);
    if (res.status === 402 || res.status === 403) {
      throw new HaltError(`Firecrawl blocked (${res.status}): ${text.slice(0, 200)}`, "firecrawl_blocked");
    }
    throw new Error(`fetch failed (${res.status}): ${text.slice(0, 160)}`);
  }

  let data: any = {};
  try { data = JSON.parse(text); } catch { data = {}; }
  const markdown: string = data.data?.markdown || data.markdown || "";
  const rawLinks: string[] = data.data?.links || data.links || [];
  return { markdown, links: Array.isArray(rawLinks) ? rawLinks : [] };
}

interface Extraction {
  value_amount: number | null;
  value_currency: string | null;
  value_basis: string | null;
  value_evidence: string | null;
  value_confidence: string | null;
  deadline: string | null;
  official_source_url: string | null;
  summary: string | null;
  is_award_notice: boolean;
  /** Recovered only to fill gaps left by the listing page, never to overwrite. */
  buyer: string | null;
  country: string | null;
}


async function extractFromContent(
  row: { title: string; organization: string | null },
  sources: { label: string; url: string; content: string }[],
  lovableKey: string,
  todayISO: string,
): Promise<Extraction | null> {
  const corpus = sources
    .map((s) => `--- SOURCE: ${s.label} (${s.url}) ---\n${s.content.substring(0, 14_000)}`)
    .join("\n\n")
    .substring(0, 40_000);

  const res = await withTimeout(
    fetch(AI_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You read the official notice page and tender documents for ONE procurement opportunity and report only facts written verbatim in the supplied content. Today is ${todayISO}.

STRICT, NO INFERENCE — every field may be null, and null is a correct, expected answer:
- value_amount: the single monetary figure for THIS opportunity's contract/budget/ceiling, as a plain number (no separators, no currency symbol, no words such as "million" — expand them: "USD 2.5 million" => 2500000). Only when explicitly stated. If only a range is given, use the upper figure and say so in value_basis. NEVER estimate, average, guess, or derive a figure from unrelated numbers (page numbers, fees, quantities, bid bonds, dates, percentages).
- value_currency: the ISO code of that figure's currency exactly as stated (USD, EUR, ZAR, KES, NGN, GHS, XOF...). Null when the figure has no stated currency.
- value_basis: one of "estimated_budget", "ceiling", "contract_award", "range_upper", "other" — what the figure actually is.
- value_evidence: the exact sentence or table line the figure was read from, verbatim, max 300 characters.
- value_confidence: "high" when the figure is labelled as the contract/budget value for this opportunity; "medium" when the label is indirect but unambiguous; null when there is no figure.
- deadline: the closing/submission/bid deadline as YYYY-MM-DD, only when explicitly written for THIS opportunity. Never a publication date, never today, never inferred.
- official_source_url: the buying organisation's own notice/tender page URL if one appears in the content; null otherwise. Never invent a URL.
- summary: a factual scope-of-work summary of THIS opportunity in English, 2-6 sentences (max 1500 characters), built only from wording in the supplied content: what is being procured, for whom, lots/quantities, place of performance, and stated eligibility or submission requirements. Condense and translate; never add claims, benefits, or context that is not written there. Null when the content carries no scope description.
- is_award_notice: true when the content shows this is a notice of a contract ALREADY awarded or signed rather than an open invitation to bid; false otherwise.

- buyer: the buying organisation running this procurement, exactly as named in the content (e.g. "UNDP", "UNICEF", "Ministry of Health"). Null when no organisation is named. Never a reference code, notice type or country.
- country: the country where the work or delivery takes place, in English, only when written in the content. Null when not stated or when it covers several countries.

A bid bond, tender fee, document purchase price, registration fee, or insurance figure is NOT the contract value. Return null rather than any of those.`,
          },

          {
            role: "user",
            content: `Opportunity: ${row.title}\nIssuing organisation: ${row.organization || "unknown"}\n\n${corpus}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_extraction",
              description: "Report only explicitly stated facts; use null where nothing is stated.",
              parameters: {
                type: "object",
                properties: {
                  value_amount: { type: ["number", "null"] },
                  value_currency: { type: ["string", "null"] },
                  value_basis: { type: ["string", "null"] },
                  value_evidence: { type: ["string", "null"] },
                  value_confidence: { type: ["string", "null"] },
                  deadline: { type: ["string", "null"] },
                  official_source_url: { type: ["string", "null"] },
                  summary: { type: ["string", "null"] },
                  is_award_notice: { type: "boolean" },
                  buyer: { type: ["string", "null"] },
                  country: { type: ["string", "null"] },
                },

                required: ["value_amount", "value_currency", "value_basis", "value_evidence", "value_confidence", "deadline", "official_source_url", "summary", "is_award_notice", "buyer", "country"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_extraction" } },
      }),
    }),
    AI_TIMEOUT_MS,
    "ai",
  );

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) throw new RateLimited("AI gateway rate limited");
    if (res.status === 402) throw new HaltError(`AI credits exhausted: ${errText.slice(0, 300)}`, "ai_credits");
    if (res.status === 403) throw new HaltError(`AI blocked by workspace policy: ${errText.slice(0, 300)}`, "ai_blocked");
    if (res.status === 401) throw new HaltError(`AI credential invalid: ${errText.slice(0, 300)}`, "ai_auth");
    throw new Error(`AI error (${res.status}): ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  let parsed: any = {};
  try { parsed = JSON.parse(args); } catch { return null; }

  // Sanity gates — a fabricated or nonsensical figure is discarded, not stored.
  let amount: number | null = typeof parsed.value_amount === "number" && isFinite(parsed.value_amount)
    ? parsed.value_amount
    : null;
  if (amount !== null && (amount <= 0 || amount > 1e12)) amount = null;

  let deadline: string | null = typeof parsed.deadline === "string" && /^\d{4}-\d{2}-\d{2}/.test(parsed.deadline)
    ? parsed.deadline.substring(0, 10)
    : null;
  if (deadline && Number.isNaN(new Date(deadline).getTime())) deadline = null;

  let official: string | null = typeof parsed.official_source_url === "string" && /^https?:\/\//i.test(parsed.official_source_url)
    ? parsed.official_source_url.substring(0, 1000)
    : null;
  if (official && official.length < 12) official = null;

  return {
    value_amount: amount,
    value_currency: amount !== null && typeof parsed.value_currency === "string"
      ? parsed.value_currency.toUpperCase().slice(0, 8)
      : null,
    value_basis: amount !== null && typeof parsed.value_basis === "string" ? parsed.value_basis.slice(0, 40) : null,
    value_evidence: amount !== null && typeof parsed.value_evidence === "string" ? parsed.value_evidence.slice(0, 400) : null,
    value_confidence: amount !== null && typeof parsed.value_confidence === "string" ? parsed.value_confidence.slice(0, 20) : null,
    deadline,
    official_source_url: official,
    summary: typeof parsed.summary === "string" && parsed.summary.trim().length >= 40
      ? parsed.summary.trim().slice(0, 2000)
      : null,
    is_award_notice: parsed.is_award_notice === true,
    buyer: cleanTextField(parsed.buyer),
    country: cleanTextField(parsed.country),
  };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("SCRAPE_CRON_SECRET");
  const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // ---- Auth: shared cron secret, or a signed-in admin ----
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    if (!isCron) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      const { data: roleRow } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
      if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    const action: string = body.action || "run";

    const { data: state } = await supabase
      .from("enrichment_job_state").select("*").eq("id", true).maybeSingle();

    if (action === "status") {
      const counts = await coverageCounts(supabase);
      return json({ ok: true, state, coverage: counts });
    }

    if (action === "resume") {
      await supabase.from("enrichment_job_state")
        .update({ paused: false, paused_reason: null, paused_at: null, last_run_error: null })
        .eq("id", true);
      return json({ ok: true, resumed: true });
    }

    if (action === "requeue") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 500) : [];
      let q = supabase.from("scraped_rfps")
        .update({ enrichment_status: "pending", enrichment_attempts: 0, enrichment_error: null });
      q = ids.length ? q.in("id", ids) : q.eq("enrichment_status", "parked");
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, requeued: ids.length ? ids.length : "all parked" });
    }

    if (action !== "run") return json({ error: `unknown action: ${action}` }, 400);

    if (!FIRECRAWL_KEY || !LOVABLE_KEY) {
      return json({ error: "Missing FIRECRAWL_API_KEY or LOVABLE_API_KEY" }, 500);
    }

    // ---- Paused-state guard: pause holds until an owner resumes; one probe row per run. ----
    const paused = !!state?.paused;
    const batchSize = paused ? 1 : Math.min(Number(body.limit) || BATCH_SIZE, 20);

    // ---- Single-flight lease ----
    const nowIso = new Date().toISOString();
    const leaseUntil = new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString();
    const holder = crypto.randomUUID();
    const { data: leased } = await supabase
      .from("enrichment_job_state")
      .update({ lease_until: leaseUntil, lease_holder: holder })
      .eq("id", true)
      .or(`lease_until.is.null,lease_until.lt.${nowIso}`)
      .select("id");
    if (!leased || leased.length === 0) {
      return json({ ok: true, skipped: "another run holds the lease" });
    }

    const runDeadline = Date.now() + TIME_BUDGET_MS;
    const todayISO = new Date().toISOString().slice(0, 10);

    const { data: queue } = await supabase
      .from("scraped_rfps")
      .select("id, title, organization, location, source_url, additional_source_urls, deadline, value_amount, description, enrichment_attempts")
      .eq("enrichment_status", "pending")
      .eq("africa_relevant", true)
      .in("status", ["open", "closing_soon"])
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(batchSize);

    const rows = queue || [];
    let processed = 0, valuesFound = 0, deadlinesFound = 0, summariesFound = 0, failed = 0, rateLimitHits = 0;
    let halt: HaltError | null = null;

    for (const row of rows as any[]) {
      if (Date.now() > runDeadline) break;

      const attempts = (row.enrichment_attempts || 0) + 1;
      try {
        const pageUrl = String(row.source_url).split("#")[0];
        const readSources: { label: string; url: string; content: string }[] = [];

        const page = await firecrawlMarkdown(pageUrl, FIRECRAWL_KEY, LOVABLE_KEY, true, PAGE_TIMEOUT_MS);
        if (page.markdown && page.markdown.length > 60) {
          readSources.push({ label: "notice page", url: pageUrl, content: page.markdown });
        }

        // Tender documents linked from the notice page. File extensions first,
        // then download/attachment endpoints that serve documents without one.
        const httpLinks = page.links.filter((l): l is string => typeof l === "string" && /^https?:\/\//i.test(l));
        const byExtension = httpLinks.filter((l) => DOC_RE.test(l));
        const byEndpoint = httpLinks.filter((l) => !DOC_RE.test(l) && DOC_ENDPOINT_RE.test(l));
        const docUrls = Array.from(new Set([...byExtension, ...byEndpoint])).slice(0, 8);
        console.log(`row ${row.id}: page ${page.markdown?.length || 0} chars, ${httpLinks.length} links, ${docUrls.length} document candidates`);


        for (const docUrl of docUrls.slice(0, MAX_DOCS_PER_ROW)) {
          if (Date.now() > runDeadline) break;
          try {
            const doc = await firecrawlMarkdown(docUrl, FIRECRAWL_KEY, LOVABLE_KEY, false, DOC_TIMEOUT_MS);
            if (doc.markdown && doc.markdown.length > 60) {
              readSources.push({ label: "tender document", url: docUrl, content: doc.markdown });
            }
          } catch (e) {
            if (e instanceof HaltError) throw e;
            if (e instanceof RateLimited) { rateLimitHits++; break; }
            console.log(`doc read failed ${docUrl}: ${e instanceof Error ? e.message : e}`);
          }
        }

        if (readSources.length === 0) throw new Error("no readable content on notice page or documents");

        const ex = await extractFromContent(row, readSources, LOVABLE_KEY, todayISO);

        const update: Record<string, unknown> = {
          document_urls: docUrls,
          enrichment_status: "done",
          enrichment_attempts: attempts,
          enrichment_error: null,
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (ex?.value_amount != null) {
          const currency = ex.value_currency || "USD";
          update.value_amount = ex.value_amount;
          update.value_currency = currency;
          update.value_basis = ex.value_basis;
          update.value_evidence = ex.value_evidence;
          update.value_confidence = ex.value_confidence;
          update.value_source_url = readSources[readSources.length - 1].url;
          update.needs_fx_review = currency.toUpperCase() !== "USD";
          update.budget = formatValue(ex.value_amount, currency);
          valuesFound++;
        }

        if (ex?.deadline && !row.deadline) {
          const normalized = normalizeDeadline(ex.deadline);
          update.deadline = normalized;
          update.status = deadlineStatus(normalized);
          update.needs_review = false;
          deadlinesFound++;
        }

        if (ex?.official_source_url) update.official_source_url = ex.official_source_url;

        // Gap filling only: the listing page stays authoritative where it had a value.
        if (ex?.buyer && !(row as { organization?: string | null }).organization) {
          update.organization = ex.buyer.slice(0, 300);
          buyersFound++;
        }
        if (ex?.country && !(row as { location?: string | null }).location) {
          update.location = ex.country.slice(0, 120);
          countriesFound++;
        }


        // Only replace the stored summary when the document read produced something fuller.
        const existingSummary = ((row as { description?: string | null }).description || "").trim();
        if (ex?.summary && ex.summary.length > existingSummary.length) {
          update.description = ex.summary;
          update.description_source = "tender_documents";
          summariesFound++;
        }

        if (ex?.is_award_notice) update.is_award_notice = true;

        await supabase.from("scraped_rfps").update(update).eq("id", row.id);
        processed++;

        // A successful probe clears a pause caused by credits/policy.
        if (paused) {
          await supabase.from("enrichment_job_state")
            .update({ paused: false, paused_reason: null, paused_at: null }).eq("id", true);
        }
      } catch (e) {
        if (e instanceof HaltError) { halt = e; break; }
        if (e instanceof RateLimited) {
          rateLimitHits++;
          await supabase.from("scraped_rfps")
            .update({ enrichment_error: "rate limited, will retry next run" }).eq("id", row.id);
          if (rateLimitHits >= MAX_RATE_LIMIT_HITS) break; // park until the next scheduled run
          await new Promise((r) => setTimeout(r, 4_000));
          continue;
        }
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("scraped_rfps").update({
          enrichment_status: attempts >= MAX_ATTEMPTS ? "parked" : "pending",
          enrichment_attempts: attempts,
          enrichment_error: msg.slice(0, 500),
        }).eq("id", row.id);
      }

      await new Promise((r) => setTimeout(r, ITEM_SLEEP_MS));
    }

    // ---- Circuit breaker ----
    if (halt) {
      await supabase.from("enrichment_job_state").update({
        paused: true,
        paused_reason: `${halt.reason}: ${halt.message}`.slice(0, 500),
        paused_at: new Date().toISOString(),
        last_run_error: halt.message.slice(0, 500),
        lease_until: null,
        lease_holder: null,
        last_run_at: new Date().toISOString(),
        last_run_processed: processed,
        last_run_values_found: valuesFound,
      }).eq("id", true);

      try { await sendScrapeAlert(supabase, {
        type: "auth_failure",
        key: `enrichment:${halt.reason}`,
        severity: "critical",
        subject: "Value extraction paused",
        detail: `The deep-read value extraction job halted and is paused.\n\nReason: ${halt.reason}\n${halt.message}\n\nIt will not resume until the underlying issue clears or you resume it from the admin scrape page.`,
      }); } catch { /* alerting must not mask the halt */ }

      return json({ ok: false, paused: true, reason: halt.reason, processed, values_found: valuesFound }, 200);
    }

    await supabase.from("enrichment_job_state").update({
      lease_until: null,
      lease_holder: null,
      last_run_at: new Date().toISOString(),
      last_run_processed: processed,
      last_run_values_found: valuesFound,
      last_run_error: failed > 0 ? `${failed} listing(s) failed this run` : null,
    }).eq("id", true);

    if (valuesFound > 0 || deadlinesFound > 0) {
      try { await supabase.rpc("refresh_homepage_live_stats"); } catch { /* stats refresh is best-effort */ }
    }

    return json({
      ok: true,
      queued: rows.length,
      processed,
      values_found: valuesFound,
      deadlines_recovered: deadlinesFound,
      summaries_written: summariesFound,
      buyers_recovered: buyersFound,
      countries_recovered: countriesFound,
      failed,
      rate_limited: rateLimitHits,
      was_probe: paused,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("enrich-rfps fatal:", msg);
    try {
      await supabase.from("enrichment_job_state")
        .update({ lease_until: null, lease_holder: null, last_run_error: msg.slice(0, 500) })
        .eq("id", true);
    } catch { /* releasing the lease is best-effort */ }
    return json({ error: msg }, 500);
  }
});

async function coverageCounts(supabase: any) {
  const base = () => supabase
    .from("scraped_rfps")
    .select("id", { count: "exact", head: true })
    .eq("africa_relevant", true)
    .in("status", ["open", "closing_soon"]);

  const [total, withValue, withDeadline, withOfficial, pending, parked, done] = await Promise.all([
    base(),
    base().not("value_amount", "is", null),
    base().not("deadline", "is", null),
    base().not("official_source_url", "is", null),
    base().eq("enrichment_status", "pending"),
    base().eq("enrichment_status", "parked"),
    base().eq("enrichment_status", "done"),
  ]);

  return {
    live_total: total.count ?? 0,
    with_value: withValue.count ?? 0,
    with_deadline: withDeadline.count ?? 0,
    with_official_source: withOfficial.count ?? 0,
    pending: pending.count ?? 0,
    parked: parked.count ?? 0,
    done: done.count ?? 0,
  };
}
