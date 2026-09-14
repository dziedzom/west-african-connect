import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendScrapeAlert } from "../_shared/scrape-alerts.ts";

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
    const sevenDaysAgo = new Date(nowMs - 7 * 86400_000).toISOString();
    const windowStart = new Date(nowMs - HEARTBEAT_WINDOW_HOURS * 3600_000).toISOString();

    const { data: sources } = await supabase
      .from("scrape_sources")
      .select("id, name, url, domain, category, priority, enabled, auto_disabled_until, consecutive_failures, last_run_at, last_success_at, last_error, total_runs, successful_runs")
      .order("priority", { ascending: true })
      .order("name", { ascending: true });

    const { data: recentRows } = await supabase
      .from("scraped_rfps")
      .select("source_name")
      .gte("created_at", sevenDaysAgo)
      .limit(20000);

    const rowsBySource = new Map<string, number>();
    for (const r of (recentRows ?? []) as Array<{ source_name: string | null }>) {
      const key = r.source_name ?? "unknown";
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
        problems.push(`No scrape run returned HTTP 200 in the last ${HEARTBEAT_WINDOW_HOURS} hours.`);
      }
      if (successfulSources.length === 0) {
        problems.push(`No source recorded a success in the last ${HEARTBEAT_WINDOW_HOURS} hours.`);
      }
      if (!newRowCount || newRowCount === 0) {
        problems.push(`No new listings were written in the last ${HEARTBEAT_WINDOW_HOURS} hours.`);
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
            `Sources with no success in ${HEARTBEAT_WINDOW_HOURS}h: ${freshness.length - successfulSources.length} of ${freshness.length}`,
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
        window_hours: HEARTBEAT_WINDOW_HOURS,
        healthy: problems.length === 0,
        problems,
        runs_ok_in_window: okRuns?.length ?? 0,
        sources_with_success: successfulSources.length,
        sources_total: freshness.length,
        new_rows_in_window: newRowCount ?? 0,
        alert,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
