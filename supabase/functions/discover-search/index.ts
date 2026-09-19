// Search-based discovery pass.
// Runs procurement-phrasing web searches (Brave Search API) across configured
// sectors and countries, and produces two outputs:
//   1. individual tender results, into an admin review queue (never auto-published)
//   2. candidate portals — domains producing repeated positive tender hits
//
// Candidate scoring uses POSITIVE tender hits only. Rejections are recorded for
// visibility but never reduce a domain's score, so a ministry site that also
// publishes news still surfaces.
//
// Nothing about scrape-rfps, enrich-rfps, filters, listings or Bid Studio changes.
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendScrapeAlert } from "../_shared/scrape-alerts.ts";
import {
  escapeHtml,
  leadDaysForSector,
  loadTelegramSettings,
  parseDeadlineHint,
  sectorLike,
  sendTelegram,
  type TelegramSettings,
} from "../_shared/telegram.ts";

const ACTIVE_PROSPECT_STATUSES = ["new", "contacted", "interested", "engaged"];


function placeLike(a?: string | null, b?: string | null): boolean {
  const x = (a ?? "").toLowerCase().trim();
  const y = (b ?? "").toLowerCase().trim();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

function reviewLink(settings: TelegramSettings, resultId: string): string {
  return `${settings.admin_base_url.replace(/\/+$/, "")}/scrape#discovery-${resultId}`;
}

function formatDeadline(iso: string | null): string {
  if (!iso) return "not stated on the page";
  return new Date(iso).toISOString().slice(0, 10);
}

interface NotifyOutcome {
  prospect_matches: number;
  priority_sector: number;
  candidate_portals: number;
  suppressed: number;
}

/**
 * Pushes only what is worth a team's attention: tenders matching an active
 * prospect's sector and country, priority-sector tenders with real lead time,
 * and newly surfaced candidate portals. Everything else stays in the queue.
 */
async function notifyDiscoveries(
  supabase: any,
  runId: string,
  newlySurfacedDomains: string[],
): Promise<NotifyOutcome> {
  const outcome: NotifyOutcome = {
    prospect_matches: 0, priority_sector: 0, candidate_portals: 0, suppressed: 0,
  };
  const settings = await loadTelegramSettings(supabase);
  if (!settings.enabled) return outcome;

  // Candidate portals are rare and always worth seeing.
  for (const domain of newlySurfacedDomains) {
    const { data: cand } = await supabase
      .from("discovery_candidate_sources").select("*").eq("domain", domain).maybeSingle();
    if (!cand) continue;
    const res = await sendTelegram(supabase, {
      category: "candidate_portal",
      key: `candidate:${domain}`,
      subject: `New candidate portal: ${domain}`,
      settings,
      html: [
        `🆕 <b>New candidate portal</b>`,
        `<b>${escapeHtml(domain)}</b>`,
        `Positive tender hits: ${cand.positive_hits}`,
        cand.countries?.length ? `Countries: ${escapeHtml(cand.countries.join(", "))}` : "",
        cand.sample_titles?.length
          ? `Examples:\n${cand.sample_titles.slice(0, 3).map((t: string) => `• ${escapeHtml(t)}`).join("\n")}`
          : "",
        `\n<a href="${settings.admin_base_url.replace(/\/+$/, "")}/scrape#discovery-candidates">Review candidate portals</a>`,
      ].filter(Boolean).join("\n"),
    });
    if (res.status === "sent") outcome.candidate_portals++;
  }

  const { data: results } = await supabase
    .from("discovery_results").select("*")
    .eq("run_id", runId).eq("review_state", "pending");
  if (!results || results.length === 0) return outcome;

  const { data: prospects } = await supabase
    .from("prospects").select("company_name, sector, location, status")
    .in("status", ACTIVE_PROSPECT_STATUSES);

  const priority = (settings.priority_sectors ?? []).filter(Boolean);

  type Queued = { category: "prospect_match" | "priority_sector"; row: any; html: string; subject: string };
  const queue: Queued[] = [];

  for (const row of results) {
    const haystack = `${row.title ?? ""} ${row.snippet ?? ""}`;
    const deadline = parseDeadlineHint(haystack);
    const base = [
      `<b>${escapeHtml(String(row.title ?? "").slice(0, 200))}</b>`,
      `Buyer / source: ${escapeHtml(row.domain ?? "unknown")}`,
      `Country: ${escapeHtml(row.country ?? "not detected")}`,
      `Sector: ${escapeHtml(row.sector ?? "unclassified")}`,
      `Deadline: ${formatDeadline(deadline)}`,
      `\n<a href="${reviewLink(settings, row.id)}">Open in the review queue</a>`,
      `<a href="${escapeHtml(row.url)}">Original notice</a>`,
    ];

    const match = (prospects ?? []).find((p: any) =>
      sectorLike(row.sector, p.sector) &&
      (placeLike(row.country, p.location) || placeLike(haystack, p.location))
    );

    if (match) {
      queue.push({
        category: "prospect_match",
        row,
        subject: `Prospect match for ${match.company_name}`,
        html: [`🎯 <b>Matches prospect: ${escapeHtml(match.company_name)}</b>`, ...base].join("\n"),
      });
      continue;
    }

    const isPriority = priority.some((s) => sectorLike(row.sector, s));
    const leadMs = Date.now() + leadDaysForSector(settings, row.sector) * 86_400_000;
    const hasLeadTime = deadline
      ? new Date(deadline).getTime() >= leadMs
      : settings.send_unknown_deadline;

    if (isPriority && hasLeadTime) {
      queue.push({
        category: "priority_sector",
        row,
        subject: `Priority sector tender: ${row.sector ?? "unclassified"}`,
        html: [`📌 <b>Priority sector opportunity</b>`, ...base].join("\n"),
      });
    } else {
      outcome.suppressed++;
    }
  }

  // Prospect matches first, then priority sectors, capped per run so a noisy
  // day can never flood the channel.
  queue.sort((a, b) => (a.category === b.category ? 0 : a.category === "prospect_match" ? -1 : 1));
  let sent = 0;
  for (const item of queue) {
    if (sent >= settings.max_messages_per_run) {
      outcome.suppressed++;
      continue;
    }
    const res = await sendTelegram(supabase, {
      category: item.category,
      key: `result:${item.row.id}`,
      subject: item.subject,
      settings,
      html: item.html,
    });
    if (res.status === "sent") {
      sent++;
      if (item.category === "prospect_match") outcome.prospect_matches++;
      else outcome.priority_sector++;
    }
  }

  return outcome;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";
const SEARCH_COST_PER_QUERY = 0.005; // $5 / 1,000 queries
const TIME_BUDGET_MS = 115_000;
const QUERY_TIMEOUT_MS = 15_000;
const QUERY_SLEEP_MS = 1_100;        // Brave free tier is ~1 query/second
const BROAD_SHARE = 0.7;             // share of the cap spent on country-wide queries

/** Domains that never carry a real African tender notice. LinkedIn first. */
const BLOCKED_DOMAINS = [
  "linkedin.com", "lnkd.in", "facebook.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "pinterest.com", "reddit.com", "medium.com",
  "wikipedia.org", "scribd.com", "slideshare.net", "issuu.com",
  "indeed.com", "glassdoor.com", "jobberman.com", "brightermonday.com", "myjobmag.com",
  "jobs.undp.org", "unjobs.org", "reliefweb.int",
  "globaltenders.com", "tendersontime.com", "biddetail.com", "bidsinfo.com",
  "tendersinfo.com", "tenderimpulse.com", "zonebourse.com", "amazon.com", "alibaba.com",
  "github.com", "gitlab.com", "stackoverflow.com",
];

const TENDER_HINT_RE = new RegExp(
  [
    "tender", "procurement", "\\brfp\\b", "\\brfq\\b", "\\breoi\\b", "\\beoi\\b",
    "request for proposal", "request for quotation", "invitation to bid",
    "invitation to tender", "call for proposal", "expression of interest",
    "prequalification", "pre-qualification", "bid notice", "bidding document",
    "appel d'?offres", "avis d'?appel", "manifestation d'?int", "concurso",
    "consultanc", "terms of reference", "\\btor\\b", "solicitation",
  ].join("|"),
  "i",
);

/** Pages that look like news, galleries or navigation rather than a notice. */
const NON_TENDER_RE = /(news|gallery|photo|press[- ]release|blog|vacanc|recruit|career|job[- ]?opening|newsletter|annual[- ]report|speech)/i;

const AFRICA_TERMS = [
  "africa", "african", "afrique", "sub-saharan",
  "algeria", "angola", "benin", "botswana", "burkina", "burundi", "cabo verde", "cape verde",
  "cameroon", "central african", "chad", "comoros", "congo", "côte d'ivoire", "cote d'ivoire",
  "ivory coast", "djibouti", "egypt", "equatorial guinea", "eritrea", "eswatini", "ethiopia",
  "gabon", "gambia", "ghana", "guinea", "kenya", "lesotho", "liberia", "libya", "madagascar",
  "malawi", "mali", "mauritania", "mauritius", "morocco", "mozambique", "namibia", "niger",
  "nigeria", "rwanda", "sao tome", "senegal", "seychelles", "sierra leone", "somalia",
  "south africa", "south sudan", "sudan", "tanzania", "togo", "tunisia", "uganda", "zambia",
  "zimbabwe",
];

const AFRICAN_TLDS = [
  ".gh", ".ng", ".ke", ".ci", ".sn", ".rw", ".tz", ".za", ".ug", ".zm", ".et", ".gm", ".sl",
  ".lr", ".bj", ".bf", ".ml", ".ne", ".td", ".cm", ".ga", ".cg", ".cd", ".ao", ".mz", ".mw",
  ".zw", ".bw", ".na", ".ls", ".sz", ".mg", ".mu", ".sc", ".dj", ".so", ".ss", ".sd", ".eg",
  ".ma", ".tn", ".dz", ".gn", ".gw", ".tg", ".cv", ".km", ".bi",
];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "that", "this", "are", "was", "were", "will",
  "shall", "any", "all", "not", "his", "her", "its", "our", "their", "des", "les", "pour",
  "une", "aux", "sur", "par", "dans", "tender", "notice", "request", "proposal", "proposals",
  "quotation", "invitation", "expression", "interest", "procurement", "services", "service",
  "supply", "provision",
]);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isBlocked(host: string): boolean {
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Significant-word key so translated/truncated variants of one title collide. */
function titleKey(title: string): string {
  const words = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).sort().slice(0, 10).join("-");
}

function looksAfrican(text: string, host: string): boolean {
  const t = text.toLowerCase();
  if (AFRICA_TERMS.some((c) => t.includes(c))) return true;
  return AFRICAN_TLDS.some((tld) => host.endsWith(tld));
}

const TLD_COUNTRY: Record<string, string> = {
  ".gh": "Ghana", ".ng": "Nigeria", ".ke": "Kenya", ".ci": "Côte d'Ivoire", ".sn": "Senegal",
  ".rw": "Rwanda", ".tz": "Tanzania", ".za": "South Africa", ".ug": "Uganda", ".zm": "Zambia",
  ".et": "Ethiopia", ".mz": "Mozambique", ".zw": "Zimbabwe", ".bw": "Botswana", ".na": "Namibia",
  ".mw": "Malawi", ".ma": "Morocco", ".tn": "Tunisia", ".eg": "Egypt", ".cm": "Cameroon",
};

/**
 * The country a result is actually about — the query's country is only a search
 * term, and search engines happily return neighbours. Never guess: fall back to
 * null and let the enrichment pass read the real location off the notice.
 */
function detectCountry(text: string, host: string, queryCountry: string): string | null {
  const t = text.toLowerCase();
  if (t.includes(queryCountry.toLowerCase())) return queryCountry;
  for (const [tld, name] of Object.entries(TLD_COUNTRY)) {
    if (host.endsWith(tld)) return name;
  }
  const names = Object.values(TLD_COUNTRY);
  const hit = names.find((n) => t.includes(n.toLowerCase()));
  return hit ?? null;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface BraveResult {
  url: string;
  title: string;
  description?: string;
  page_age?: string;
}

class HaltError extends Error {}

async function braveSearch(
  query: string,
  key: string,
  count: number,
  freshness: string,
): Promise<BraveResult[]> {
  const url = `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${count}` +
    `&freshness=${encodeURIComponent(freshness)}&safesearch=off&result_filter=web&spellcheck=0`;
  const res = await withTimeout(
    fetch(url, { headers: { Accept: "application/json", "X-Subscription-Token": key } }),
    QUERY_TIMEOUT_MS,
    "Brave search",
  );
  if (res.status === 401 || res.status === 403) {
    throw new HaltError(`Brave rejected the API key (${res.status})`);
  }
  if (res.status === 429) {
    // Free tier rate limit — back off once, then give up on this query.
    await sleep(2_000);
    const retry = await withTimeout(
      fetch(url, { headers: { Accept: "application/json", "X-Subscription-Token": key } }),
      QUERY_TIMEOUT_MS,
      "Brave search retry",
    );
    if (!retry.ok) throw new Error(`Brave ${retry.status}`);
    const rj = await retry.json();
    return rj?.web?.results ?? [];
  }
  if (res.status === 402) throw new HaltError("Brave subscription exhausted (402)");
  if (!res.ok) throw new Error(`Brave ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return body?.web?.results ?? [];
}

interface Combo {
  phrase: string;
  sector: string | null;
  country: string;
  threshold: number;
}

function buildQuery(c: Combo): string {
  const parts = [`"${c.phrase}"`];
  if (c.sector) parts.push(c.sector);
  parts.push(c.country);
  parts.push("-site:linkedin.com", "-site:indeed.com", "-site:globaltenders.com");
  return parts.join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("SCRAPE_CRON_SECRET");
  const BRAVE_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // ---- Auth: shared cron secret, or a signed-in admin ----
    let actorId: string | null = null;
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    if (!isCron) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      actorId = claims.claims.sub as string;
      const { data: roleRow } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", actorId).eq("role", "admin").maybeSingle();
      if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    const action: string = body.action || "run";

    const { data: state } = await supabase
      .from("discovery_state").select("*").eq("id", true).maybeSingle();

    // ------------------------------------------------------------------ status
    if (action === "status") {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const [pending, candidates, runs, monthRuns, published] = await Promise.all([
        supabase.from("discovery_results")
          .select("*").eq("review_state", "pending").order("created_at", { ascending: false }).limit(200),
        supabase.from("discovery_candidate_sources")
          .select("*").eq("review_state", "new").eq("surfaced", true)
          .order("positive_hits", { ascending: false }).limit(100),
        supabase.from("discovery_runs")
          .select("*").order("started_at", { ascending: false }).limit(15),
        supabase.from("discovery_runs")
          .select("queries_issued, est_search_cost_usd, est_read_cost_usd")
          .gte("started_at", monthStart.toISOString()),
        supabase.from("scraped_rfps")
          .select("id", { count: "exact", head: true }).eq("discovery_method", "search"),
      ]);

      const mtd = (monthRuns.data ?? []).reduce(
        (acc, r: any) => ({
          queries: acc.queries + (r.queries_issued || 0),
          cost: acc.cost + Number(r.est_search_cost_usd || 0) + Number(r.est_read_cost_usd || 0),
        }),
        { queries: 0, cost: 0 },
      );

      return json({
        ok: true,
        state,
        key_configured: !!BRAVE_KEY,
        pending: pending.data ?? [],
        candidates: candidates.data ?? [],
        runs: runs.data ?? [],
        month_to_date: mtd,
        published_from_search: published.count ?? 0,
      });
    }

    // ----------------------------------------------------------------- approve
    if (action === "approve") {
      const id: string = body.id;
      if (!id) return json({ error: "id required" }, 400);
      const { data: row } = await supabase
        .from("discovery_results").select("*").eq("id", id).maybeSingle();
      if (!row) return json({ error: "Result not found" }, 404);
      if (row.review_state === "approved" && row.rfp_id) {
        return json({ ok: true, already: true, rfp_id: row.rfp_id });
      }

      const host = row.domain;
      const { data: inserted, error: insErr } = await supabase
        .from("scraped_rfps")
        .insert({
          title: row.title,
          description: cleanTextField(row.snippet),
          description_source: cleanTextField(row.snippet) ? "search_result" : null,
          source_url: row.url,
          official_source_url: row.url,
          portal: `Search: ${host}`,
          source_domain: host,
          source_category: "other",
          category: cleanTextField(row.sector),
          location: cleanTextField(row.country),
          status: "open",
          africa_relevant: true,
          content_hash: await sha256(`${titleKey(row.title)}|${host}`),
          enrichment_status: "pending",
          discovery_method: "search",
          discovery_result_id: row.id,
        })
        .select("id").single();
      if (insErr) return json({ error: `Could not publish: ${insErr.message}` }, 400);

      await supabase.from("discovery_results").update({
        review_state: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
        rfp_id: inserted.id,
      }).eq("id", id);

      return json({ ok: true, rfp_id: inserted.id });
    }

    // ------------------------------------------------------------------ reject
    if (action === "reject") {
      const id: string = body.id;
      const notTender: boolean = !!body.not_tender;
      if (!id) return json({ error: "id required" }, 400);
      const { data: row } = await supabase
        .from("discovery_results").select("id, domain, review_state").eq("id", id).maybeSingle();
      if (!row) return json({ error: "Result not found" }, 404);

      await supabase.from("discovery_results").update({
        review_state: notTender ? "not_tender" : "rejected",
        review_reason: body.reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
      }).eq("id", id);

      // Visibility only: these counters never reduce the candidate score.
      const { data: cand } = await supabase
        .from("discovery_candidate_sources")
        .select("id, rejected_hits, not_tender_hits").eq("domain", row.domain).maybeSingle();
      if (cand) {
        await supabase.from("discovery_candidate_sources").update(
          notTender
            ? { not_tender_hits: (cand.not_tender_hits || 0) + 1 }
            : { rejected_hits: (cand.rejected_hits || 0) + 1 },
        ).eq("id", cand.id);
      }
      return json({ ok: true });
    }

    // -------------------------------------------------------------- add_source
    if (action === "add_source") {
      const id: string = body.id;
      if (!id) return json({ error: "id required" }, 400);
      const { data: cand } = await supabase
        .from("discovery_candidate_sources").select("*").eq("id", id).maybeSingle();
      if (!cand) return json({ error: "Candidate not found" }, 404);

      const url: string = body.url || cand.sample_urls?.[0] || `https://${cand.domain}`;
      const { data: existing } = await supabase
        .from("scrape_sources").select("id").eq("domain", cand.domain).maybeSingle();

      let sourceId = existing?.id ?? null;
      if (!sourceId) {
        const { data: src, error: srcErr } = await supabase.from("scrape_sources").insert({
          name: body.name || cand.domain,
          url,
          domain: cand.domain,
          category: body.category || "other",
          priority: body.priority ?? 60,
          enabled: true,
          notes: `Added from search discovery (${cand.positive_hits} positive tender hits, first seen ${cand.first_seen_at}).`,
        }).select("id").single();
        if (srcErr) return json({ error: `Could not add source: ${srcErr.message}` }, 400);
        sourceId = src.id;
      }

      await supabase.from("discovery_candidate_sources").update({
        review_state: "added",
        existing_source_id: sourceId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
      }).eq("id", id);
      return json({ ok: true, source_id: sourceId });
    }

    // --------------------------------------------------------- dismiss / pause
    if (action === "dismiss_candidate") {
      const id: string = body.id;
      if (!id) return json({ error: "id required" }, 400);
      await supabase.from("discovery_candidate_sources").update({
        review_state: "dismissed",
        review_note: body.reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorId,
      }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "test_telegram") {
      const res = await sendTelegram(supabase, {
        category: "test",
        key: `test:${Date.now()}`,
        subject: "MiddlBrand Telegram test",
        ignoreMute: true,
        html: [
          "✅ <b>MiddlBrand alerts connected</b>",
          "This group will receive: prospect-matched tenders, priority-sector tenders with lead time, new candidate portals, and scraper credential or heartbeat failures.",
          "Thresholds and mute switches live in the admin settings.",
        ].join("\n"),
      });
      return json({ ok: res.status === "sent", telegram: res });
    }

    if (action === "resume") {
      await supabase.from("discovery_state")
        .update({ paused: false, paused_reason: null, last_run_error: null }).eq("id", true);
      return json({ ok: true, resumed: true });
    }

    if (action !== "run") return json({ error: `Unknown action: ${action}` }, 400);

    // --------------------------------------------------------------------- run
    if (!BRAVE_KEY) return json({ error: "BRAVE_SEARCH_API_KEY is not configured" }, 400);
    if (state?.paused) return json({ ok: false, paused: true, reason: state.paused_reason });

    const startedMs = Date.now();
    const cap = Math.max(1, Number(body.max_queries ?? state?.max_queries_per_run ?? 60));
    const perQuery = Math.min(20, Math.max(1, Number(state?.results_per_query ?? 10)));
    const freshness = String(state?.freshness ?? "pw");

    const [{ data: phrasings }, { data: sectors }, { data: countries }] = await Promise.all([
      supabase.from("discovery_phrasings").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("discovery_sectors").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("discovery_countries").select("*").eq("enabled", true).order("priority"),
    ]);
    if (!phrasings?.length || !countries?.length) {
      return json({ error: "No phrasings or countries configured" }, 400);
    }

    // Two rotation tiers. Broad (no sector) is the highest-yield set and cycles
    // fastest; the sector tier fills in the long tail.
    const broad: Combo[] = [];
    for (const c of countries) {
      for (const p of phrasings) {
        broad.push({ phrase: p.phrase, sector: null, country: c.country, threshold: c.candidate_threshold });
      }
    }
    const sectorTier: Combo[] = [];
    for (const c of countries) {
      for (const s of sectors ?? []) {
        for (const p of phrasings) {
          sectorTier.push({ phrase: p.phrase, sector: s.sector, country: c.country, threshold: c.candidate_threshold });
        }
      }
    }

    const cursor = Number(state?.rotation_cursor ?? 0);
    const broadCount = Math.min(broad.length, Math.round(cap * BROAD_SHARE));
    const sectorCount = Math.max(0, cap - broadCount);
    const pick = (list: Combo[], from: number, n: number) =>
      list.length ? Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(from + i) % list.length]) : [];
    const combos = [
      ...pick(broad, cursor * broadCount, broadCount),
      ...pick(sectorTier, cursor * sectorCount, sectorCount),
    ];

    const { data: run } = await supabase.from("discovery_runs").insert({
      invoked_by: isCron ? "cron" : "admin",
      rotation_cursor: cursor,
    }).select("id").single();
    const runId = run!.id;

    // Dedupe corpus: every listing we already hold, expired included.
    const [{ data: existingRfps }, { data: seenResults }] = await Promise.all([
      supabase.from("scraped_rfps").select("title, source_url").limit(5000),
      supabase.from("discovery_results").select("url").limit(5000),
    ]);
    const knownUrls = new Set<string>();
    const knownTitles = new Set<string>();
    for (const r of existingRfps ?? []) {
      knownUrls.add((r.source_url || "").replace(/\/+$/, ""));
      knownTitles.add(titleKey(r.title));
    }
    for (const r of seenResults ?? []) knownUrls.add((r.url || "").replace(/\/+$/, ""));

    let queriesIssued = 0, queriesFailed = 0, returned = 0, kept = 0, dupes = 0, excluded = 0;
    let halted: string | null = null;
    const candidateTouch = new Map<string, { hits: number; threshold: number; titles: string[]; urls: string[]; queries: string[]; countries: string[] }>();

    for (const combo of combos) {
      if (Date.now() - startedMs > TIME_BUDGET_MS) break;
      const query = buildQuery(combo);
      let results: BraveResult[] = [];
      try {
        results = await braveSearch(query, BRAVE_KEY, perQuery, freshness);
        queriesIssued++;
      } catch (e) {
        if (e instanceof HaltError) {
          halted = (e as Error).message;
          break;
        }
        queriesFailed++;
        console.error(`Query failed: ${query} — ${(e as Error).message}`);
        await sleep(QUERY_SLEEP_MS);
        continue;
      }
      returned += results.length;

      for (const r of results) {
        const url = (r.url || "").replace(/\/+$/, "");
        if (!url) continue;
        const host = hostOf(url);
        if (!host) continue;

        let verdict: string | null = null;
        let reason: string | null = null;
        const haystack = `${r.title ?? ""} ${r.description ?? ""} ${url}`;

        if (isBlocked(host)) {
          verdict = "excluded_domain";
          reason = `${host} is on the excluded list`;
        } else if (knownUrls.has(url) || knownTitles.has(titleKey(r.title ?? ""))) {
          verdict = "duplicate";
          reason = "Already held as a listing or a previous search result";
        } else if (!TENDER_HINT_RE.test(haystack) || NON_TENDER_RE.test(r.title ?? "")) {
          verdict = "not_tender";
          reason = "No procurement wording, or the page looks like news/jobs";
        } else if (!looksAfrican(haystack, host)) {
          verdict = "non_africa";
          reason = "No African country or domain in the result";
        }

        if (verdict === "duplicate") dupes++;
        else if (verdict && verdict !== "kept") excluded++;

        knownUrls.add(url);

        const detected = detectCountry(haystack, host, combo.country);
        const isKept = !verdict;
        if (isKept) {
          kept++;
          const c = candidateTouch.get(host) ?? {
            hits: 0, threshold: combo.threshold, titles: [], urls: [], queries: [], countries: [],
          };
          c.hits++;
          c.threshold = Math.min(c.threshold, combo.threshold);
          if (c.titles.length < 5) c.titles.push(r.title ?? "");
          if (c.urls.length < 5) c.urls.push(url);
          if (!c.queries.includes(query) && c.queries.length < 8) c.queries.push(query);
          if (detected && !c.countries.includes(detected)) c.countries.push(detected);
          candidateTouch.set(host, c);
        }

        await supabase.from("discovery_results").upsert({
          run_id: runId,
          query_text: query,
          phrasing: combo.phrase,
          sector: combo.sector,
          country: detected,
          url,
          domain: host,
          title: (r.title ?? url).slice(0, 500),
          snippet: (r.description ?? "").slice(0, 2000) || null,
          published_at: r.page_age ? new Date(r.page_age).toISOString() : null,
          verdict: verdict ?? "kept",
          verdict_reason: reason,
          review_state: isKept ? "pending" : "auto_dropped",
        }, { onConflict: "url", ignoreDuplicates: true });
      }

      await sleep(QUERY_SLEEP_MS);
    }

    // --- Candidate portals: positive hits only ---
    let surfaced = 0;
    const newlySurfacedDomains: string[] = [];
    for (const [domain, c] of candidateTouch) {
      const { data: existingSource } = await supabase
        .from("scrape_sources").select("id").eq("domain", domain).maybeSingle();
      const { data: prev } = await supabase
        .from("discovery_candidate_sources").select("*").eq("domain", domain).maybeSingle();

      const positive = (prev?.positive_hits ?? 0) + c.hits;
      const threshold = Math.min(prev?.threshold ?? c.threshold, c.threshold);
      const nowSurfaced = !existingSource && positive >= threshold;
      if (nowSurfaced && !prev?.surfaced) {
        surfaced++;
        newlySurfacedDomains.push(domain);
      }

      const merge = (a: string[] = [], b: string[] = [], n = 8) =>
        Array.from(new Set([...(a ?? []), ...b])).slice(0, n);

      await supabase.from("discovery_candidate_sources").upsert({
        id: prev?.id,
        domain,
        positive_hits: positive,
        threshold,
        surfaced: nowSurfaced || !!prev?.surfaced,
        sample_titles: merge(prev?.sample_titles, c.titles, 5),
        sample_urls: merge(prev?.sample_urls, c.urls, 5),
        queries: merge(prev?.queries, c.queries, 8),
        countries: merge(prev?.countries, c.countries, 10),
        existing_source_id: existingSource?.id ?? prev?.existing_source_id ?? null,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "domain" });
    }

    const telegram = await notifyDiscoveries(supabase, runId, newlySurfacedDomains)
      .catch((e) => {
        console.error("Telegram notification failed", e);
        return null;
      });

    const nextCursor = cursor + 1;
    await supabase.from("discovery_runs").update({
      finished_at: new Date().toISOString(),
      queries_issued: queriesIssued,
      queries_failed: queriesFailed,
      results_returned: returned,
      results_kept: kept,
      duplicates_dropped: dupes,
      excluded_dropped: excluded,
      candidates_surfaced: surfaced,
      est_search_cost_usd: Number((queriesIssued * SEARCH_COST_PER_QUERY).toFixed(4)),
      error: halted,
    }).eq("id", runId);

    await supabase.from("discovery_state").update({
      rotation_cursor: nextCursor,
      last_run_at: new Date().toISOString(),
      last_run_error: halted,
      ...(halted ? { paused: true, paused_reason: halted } : {}),
    }).eq("id", true);

    if (halted) {
      await sendScrapeAlert(supabase, {
        type: "auth_failure",
        key: `discovery-halt`,
        severity: "critical",
        subject: "Search discovery paused",
        detail: `The daily search discovery run stopped: ${halted}\n\nQueries issued before stopping: ${queriesIssued}.`,
      }).catch(() => {});
    }

    return json({
      ok: !halted,
      run_id: runId,
      queries_issued: queriesIssued,
      queries_failed: queriesFailed,
      results_returned: returned,
      results_kept: kept,
      duplicates_dropped: dupes,
      excluded_dropped: excluded,
      candidates_surfaced: surfaced,
      telegram,
      est_search_cost_usd: Number((queriesIssued * SEARCH_COST_PER_QUERY).toFixed(4)),
      paused: !!halted,
      error: halted,
    });
  } catch (e) {
    console.error("discover-search failed", e);
    return json({ error: (e as Error).message }, 500);
  }
});
