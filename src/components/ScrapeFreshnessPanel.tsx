import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, BellRing, HeartPulse } from "lucide-react";

interface FreshnessSource {
  id: string;
  name: string;
  category: string;
  priority: number;
  enabled: boolean;
  auto_disabled: boolean;
  auto_disabled_until: string | null;
  consecutive_failures: number;
  last_success_at: string | null;
  last_error: string | null;
  hours_since_success: number | null;
  rows_last_7d: number;
  health: "green" | "amber" | "red";
}

interface RunRow {
  id: string;
  invoked_by: string;
  batch: number | null;
  http_status: number | null;
  ok: boolean;
  portals_processed: number;
  portals_failed: number;
  rows_saved: number;
  duration_ms: number | null;
  auth_failure: boolean;
  error_summary: string | null;
  created_at: string;
}

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  subject: string;
  email_status: string;
  email_to: string | null;
  created_at: string;
}

interface MonitorPayload {
  stale_hours_threshold: number;
  summary: {
    sources_total: number;
    sources_stale: number;
    sources_auto_disabled: number;
    sources_enabled: number;
    rows_last_7d: number;
    last_run: RunRow | null;
  };
  sources: FreshnessSource[];
  recent_runs: RunRow[];
  recent_alerts: AlertRow[];
}

const relative = (iso: string | null) => {
  if (!iso) return "never";
  const hrs = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (hrs < 1) return `${Math.max(1, Math.round(hrs * 60))}m ago`;
  if (hrs < 48) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const healthClasses: Record<string, string> = {
  green: "border-l-2 border-l-primary",
  amber: "border-l-2 border-l-muted-foreground",
  red: "border-l-2 border-l-destructive bg-destructive/5",
};

const ScrapeFreshnessPanel = () => {
  const { toast } = useToast();
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("scrape-monitor", {
      body: { action: "freshness" },
    });
    if (error) {
      toast({ title: "Could not load freshness data", description: error.message, variant: "destructive" });
    } else {
      setData(res as MonitorPayload);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAction = async (action: "heartbeat" | "test_alert", label: string) => {
    setBusy(action);
    try {
      const { data: res, error } = await supabase.functions.invoke("scrape-monitor", { body: { action } });
      if (error) throw error;
      const r = res as { healthy?: boolean; problems?: string[]; alert?: { email_status?: string } };
      toast({
        title: label,
        description: action === "heartbeat"
          ? (r.healthy ? "Pipeline healthy — no alert sent." : `Problems found: ${(r.problems || []).join(" ")}`)
          : `Alert recorded. Email status: ${r.alert?.email_status ?? "unknown"}.`,
      });
      load();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (!data) return null;

  const { summary, sources, recent_runs, recent_alerts, stale_hours_threshold } = data;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Data freshness</h2>
          <p className="text-sm text-muted-foreground">
            Anything without a successful run in {stale_hours_threshold} hours is flagged red.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => runAction("heartbeat", "Heartbeat check")}>
            {busy === "heartbeat" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <HeartPulse className="mr-2 h-4 w-4" aria-hidden="true" />}
            Run heartbeat check
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => runAction("test_alert", "Test alert")}>
            {busy === "test_alert" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <BellRing className="mr-2 h-4 w-4" aria-hidden="true" />}
            Send test alert
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Sources", value: summary.sources_total },
          { label: "Enabled", value: summary.sources_enabled },
          { label: `Stale >${stale_hours_threshold}h`, value: summary.sources_stale },
          { label: "Auto-disabled", value: summary.sources_auto_disabled },
          { label: "Listings (7d)", value: summary.rows_last_7d },
        ].map((s) => (
          <div key={s.label} className="border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Last recorded run</h3>
        {summary.last_run ? (
          <p className="mt-1 text-sm text-muted-foreground">
            HTTP {summary.last_run.http_status ?? "—"} · {summary.last_run.invoked_by} · batch {summary.last_run.batch ?? "—"} ·{" "}
            {summary.last_run.rows_saved} saved · {relative(summary.last_run.created_at)}
            {summary.last_run.auth_failure ? " · credential failure" : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No runs recorded yet.</p>
        )}
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Per-source freshness and health</caption>
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="p-3">Source</th>
              <th scope="col" className="p-3">Last success</th>
              <th scope="col" className="p-3">Listings (7d)</th>
              <th scope="col" className="p-3">State</th>
              <th scope="col" className="p-3">Last error</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className={`border-t border-border ${healthClasses[s.health]}`}>
                <td className="p-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.category} · P{s.priority}</span>
                </td>
                <td className="p-3 tabular-nums">
                  {relative(s.last_success_at)}
                  {s.health === "red" && <span className="ml-2 text-xs font-medium text-destructive">stale</span>}
                </td>
                <td className="p-3 tabular-nums">{s.rows_last_7d}</td>
                <td className="p-3">
                  {s.auto_disabled ? (
                    <Badge variant="destructive">Auto-disabled</Badge>
                  ) : s.enabled ? (
                    <Badge variant="secondary">Enabled</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                  {s.consecutive_failures > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">{s.consecutive_failures} fails</span>
                  )}
                </td>
                <td className="max-w-[24rem] p-3 text-xs text-muted-foreground">
                  {s.last_error ? s.last_error.slice(0, 160) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Recent runs</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {recent_runs.length === 0 && <li>No runs recorded yet.</li>}
            {recent_runs.map((r) => (
              <li key={r.id} className="tabular-nums">
                {relative(r.created_at)} · HTTP {r.http_status ?? "—"} · batch {r.batch ?? "—"} · {r.rows_saved} saved
                {r.portals_failed > 0 ? ` · ${r.portals_failed} failed` : ""}
                {r.auth_failure ? " · credential failure" : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Recent alerts</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {recent_alerts.length === 0 && <li>No alerts raised.</li>}
            {recent_alerts.map((a) => (
              <li key={a.id}>
                {relative(a.created_at)} · {a.subject} · email {a.email_status}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ScrapeFreshnessPanel;
