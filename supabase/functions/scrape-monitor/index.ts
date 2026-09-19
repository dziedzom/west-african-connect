// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendScrapeAlert } from "../_shared/scrape-alerts.ts";
import {
  escapeHtml,
  leadDaysForSector,
  loadTelegramSettings,
  sectorLike,
  sendTelegram,
} from "../_shared/telegram.ts";

const ACTIVE_PROSPECT_STATUSES = ["new", "contacted", "interested", "engaged"];

function placeLike(a?: string | null, b?: string | null): boolean {
  const x = (a ?? "").toLowerCase().trim();
  const y = (b ?? "").toLowerCase().trim();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

/**
 * Telegram alerts for tenders found by the regular scraper (UNGM, UNDP, AfDB
 * and the rest), matching the same rules as search discovery: an active
 * prospect's sector and country, or a priority sector with enough lead time for
 * that sector. Deduped per listing, so a listing is only ever pushed once.
 */
async function notifyScrapedTenders(supabase: any, hours: number) {
  const outcome = { prospect_matches: 0, priority_sector: 0, suppressed: 0, considered: 0 };
  const settings = await loadTelegramSettings(supabase);
  if (!settings.enabled) return outcome;

  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data: rows } = await supabase
    .from("scraped_rfps")
    .select("id, title, organization, portal, location, category, deadline, source_url, created_at")
    .eq("africa_relevant", true)
    .not("is_award_notice", "is", true)
    .in("status", ["open", "closing_soon"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!rows || rows.length === 0) return outcome;
  outcome.considered = rows.length;

  const { data: prospects } = await supabase
    .from("prospects").select("company_name, sector, location, status")
    .in("status", ACTIVE_PROSPECT_STATUSES);

  const priority = (settings.priority_sectors ?? []).filter(Boolean);
  const base = settings.admin_base_url.replace(/\/+$/, "");

  type Queued = { category: "prospect_match" | "priority_sector"; id: string; subject: string; html: string };
  const queue: Queued[] = [];

  for (const row of rows as any[]) {
    const lines = [
      `<b>${escapeHtml(String(row.title ?? "").slice(0, 200))}</b>`,
      `Buyer: ${escapeHtml(row.organization ?? "not stated")}`,
      `Source: ${escapeHtml(row.portal ?? "unknown")}`,
      `Country: ${escapeHtml(row.location ?? "not stated")}`,
      `Sector: ${escapeHtml(row.category ?? "unclassified")}`,
      `Deadline: ${row.deadline ? new Date(row.deadline).toISOString().slice(0, 10) : "not stated"}`,
      `\n<a href="${base}/rfps">Open the opportunities list</a>`,
      row.source_url ? `<a href="${escapeHtml(row.source_url)}">Original notice</a>` : "",
    ].filter(Boolean);

    const match = (prospects ?? []).find((p: any) =>
      sectorLike(row.category, p.sector) && placeLike(row.location, p.location)
    );
    if (match) {
      queue.push({
        category: "prospect_match",
        id: row.id,
        subject: `Prospect match for ${match.company_name}`,
        html: [`🎯 <b>Matches prospect: ${escapeHtml(match.company_name)}</b>`, ...lines].join("\n"),
      });
      continue;
    }

    const isPriority = priority.some((s) => sectorLike(row.category, s));
    const leadMs = Date.now() + leadDaysForSector(settings, row.category) * 86_400_000;
    const hasLeadTime = row.deadline
      ? new Date(row.deadline).getTime() >= leadMs
      : settings.send_unknown_deadline;

    if (isPriority && hasLeadTime) {
      queue.push({
        category: "priority_sector",
        id: row.id,
        subject: `Priority sector tender: ${row.category ?? "unclassified"}`,
        html: [`📌 <b>New scraped opportunity</b>`, ...lines].join("\n"),
      });
    } else {
      outcome.suppressed++;
    }
  }

  queue.sort((a, b) => (a.category === b.category ? 0 : a.category === "prospect_match" ? -1 : 1));
  let sent = 0;
  for (const item of queue) {
    if (sent >= settings.max_messages_per_run) { outcome.suppressed++; continue; }
    const res = await sendTelegram(supabase, {
      category: "scraped_tender",
      key: `rfp:${item.id}`,
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

const STALE_HOURS = 72;
const HEARTBEAT_WINDOW_HOURS = 48;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("SCRAPE_CRON_SECRET");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: shared cron secret, or a signed-in admin.
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronSecret === CRON_SECRET;
    if (!isCron) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRow } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", claimsData.claims.sub).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "freshness";

    const nowMs = Date.now();
    // Optional override so the heartbeat can be exercised against a deliberately
    // narrow (stale) window during verification.
    const windowHours: number = Number(body.window_hours) > 0
      ? Number(body.window_hours)
      : HEARTBEAT_WINDOW_HOURS;
    const sevenDaysAgo = new Date(nowMs - 7 * 86400_000).toISOString();
    const windowStart = new Date(nowMs - windowHours * 3600_000).toISOString();

    const { data: sources } = await supabase
      .from("scrape_sources")
      .select("id, name, url, domain, category, priority, enabled, auto_disabled_until, consecutive_failures, last_run_at, last_success_at, last_error, total_runs, successful_runs")
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    const { data: recentRows } = await supabase
      .from("scraped_rfps")
      .select("portal")
      .gte("created_at", sevenDaysAgo)
      .limit(20000);

    const rowsBySource = new Map<string, number>();
    for (const r of (recentRows ?? []) as Array<{ portal: string | null }>) {
      const key = r.portal ?? "unknown";
      rowsBySource.set(key, (rowsBySource.get(key) ?? 0) + 1);
    }

    const freshness = (sources ?? []).map((s: Record<string, any>) => {
      const lastSuccessMs = s.last_success_at ? new Date(s.last_success_at).getTime() : null;
      const hoursSince = lastSuccessMs === null ? null : (nowMs - lastSuccessMs) / 3600_000;
      const health = hoursSince === null || hoursSince > STALE_HOURS
        ? "red"
        : hoursSince > 24 ? "amber" : "green";
      return {
        ...s,
        rows_last_7d: rowsBySource.get(s.name as string) ?? 0,
        hours_since_success: hoursSince === null ? null : Math.round(hoursSince * 10) / 10,
        auto_disabled: !!s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() > nowMs,
        health,
      };
    });

    const { data: lastRuns } = await supabase
      .from("scrape_run_log")
      .select("id, invoked_by, batch, http_status, ok, portals_processed, portals_failed, rows_saved, duration_ms, auth_failure, error_summary, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: recentAlerts } = await supabase
      .from("scrape_alert_log")
      .select("id, alert_type, severity, subject, email_status, email_to, email_error, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const staleCount = freshness.filter((f) => f.health === "red").length;
    const disabledCount = freshness.filter((f) => f.auto_disabled).length;
    const rowsLast7d = recentRows?.length ?? 0;

    if (action === "heartbeat") {
      // Evidence-based: a real HTTP 200 run in the window AND a source success AND new rows.
      const { data: okRuns } = await supabase
        .from("scrape_run_log")
        .select("id, created_at, rows_saved")
        .eq("ok", true)
        .eq("http_status", 200)
        .gte("created_at", windowStart);

      const successfulSources = freshness.filter(
        (f) => f.last_success_at && new Date(f.last_success_at).getTime() >= new Date(windowStart).getTime(),
      );

      const { count: newRowCount } = await supabase
        .from("scraped_rfps")
        .select("id", { count: "exact", head: true })
        .gte("created_at", windowStart);

      const problems: string[] = [];
      if (!okRuns || okRuns.length === 0) {
        problems.push(`No scrape run returned HTTP 200 in the last ${windowHours} hours.`);
      }
      if (successfulSources.length === 0) {
        problems.push(`No source recorded a success in the last ${windowHours} hours.`);
      }
      if (!newRowCount || newRowCount === 0) {
        problems.push(`No new listings were written in the last ${windowHours} hours.`);
      }

      let alert = null;
      if (problems.length > 0) {
        const lastSuccess = freshness
          .map((f) => f.last_success_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? "never";
        const recentErrors = freshness
          .filter((f) => f.last_error)
          .slice(0, 5)
          .map((f) => `- ${f.name}: ${String(f.last_error).slice(0, 200)}`)
          .join("\n");

        alert = await sendScrapeAlert(supabase, {
          type: "heartbeat_stale",
          key: "heartbeat-stale",
          severity: "critical",
          subject: "Scraper heartbeat failed — the pipeline is not producing data",
          detail: [
            problems.join("\n"),
            "",
            `Last successful source run: ${lastSuccess}`,
            `Sources with no success in ${windowHours}h: ${freshness.length - successfulSources.length} of ${freshness.length}`,
            `Sources stale over ${STALE_HOURS}h: ${staleCount}`,
            `Auto-disabled sources: ${disabledCount}`,
            `New listings in window: ${newRowCount ?? 0}`,
            "",
            recentErrors ? `Most recent source errors:\n${recentErrors}` : "",
          ].join("\n"),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        action: "heartbeat",
        window_hours: windowHours,
        healthy: problems.length === 0,
        problems,
        runs_ok_in_window: okRuns?.length ?? 0,
        sources_with_success: successfulSources.length,
        sources_total: freshness.length,
        new_rows_in_window: newRowCount ?? 0,
        alert,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "auth_alert") {
      // Immediate credential alert for failures recorded from the real HTTP
      // response of a cron-triggered run (pg_cron reports those as successful).
      const since = new Date(nowMs - 60 * 60_000).toISOString();
      const { data: authRows } = await supabase
        .from("scrape_run_log")
        .select("http_status, response_body, created_at, invoked_by")
        .eq("auth_failure", true)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);

      let alert = null;
      if (authRows && authRows.length > 0) {
        const first = authRows[0] as Record<string, any>;
        alert = await sendScrapeAlert(supabase, {
          type: "auth_failure",
          key: `scrape-function-auth-${first.http_status ?? "unknown"}`,
          severity: "critical",
          subject: `Scraper credential failure: scrape function returned ${first.http_status ?? "no status"}`,
          detail: [
            `${authRows.length} credential failure(s) recorded in the last hour.`,
            `Most recent: HTTP ${first.http_status ?? "none"} at ${first.created_at} (${first.invoked_by}).`,
            "",
            `Response: ${JSON.stringify(first.response_body ?? {}).slice(0, 800)}`,
            "",
            "Scheduled runs are being rejected before any page is scraped.",
          ].join("\n"),
        });
      }

      return new Response(JSON.stringify({ success: true, action: "auth_alert", failures: authRows?.length ?? 0, alert }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "notify_new") {
      const hours = Number(body.hours) > 0 ? Number(body.hours) : 24;
      const result = await notifyScrapedTenders(supabase, hours);
      return new Response(JSON.stringify({ success: true, action: "notify_new", hours, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "test_alert") {
      const alert = await sendScrapeAlert(supabase, {
        type: "test",
        key: `test-${Date.now()}`,
        severity: "warning",
        subject: "MiddlBrand scraper monitoring — test alert",
        detail: "This is a test alert confirming the monitoring email channel works end to end. No action needed.",
      });
      return new Response(JSON.stringify({ success: true, action: "test_alert", alert }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      action: "freshness",
      generated_at: new Date().toISOString(),
      stale_hours_threshold: STALE_HOURS,
      summary: {
        sources_total: freshness.length,
        sources_stale: staleCount,
        sources_auto_disabled: disabledCount,
        sources_enabled: freshness.filter((f) => f.enabled).length,
        rows_last_7d: rowsLast7d,
        last_run: lastRuns?.[0] ?? null,
      },
      sources: freshness,
      recent_runs: lastRuns ?? [],
      recent_alerts: recentAlerts ?? [],
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("scrape-monitor error:", message);
    return new Response(JSON.stringify({ error: "Monitoring check failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
