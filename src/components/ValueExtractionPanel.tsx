import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, RotateCcw, FileSearch } from "lucide-react";

interface Coverage {
  live_total: number;
  with_value: number;
  with_deadline: number;
  with_official_source: number;
  pending: number;
  parked: number;
  done: number;
}

interface JobState {
  paused: boolean;
  paused_reason: string | null;
  paused_at: string | null;
  last_run_at: string | null;
  last_run_processed: number;
  last_run_values_found: number;
  last_run_error: string | null;
  lease_until: string | null;
}

const relative = (iso: string | null) => {
  if (!iso) return "never";
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 2880) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

const ValueExtractionPanel = () => {
  const { toast } = useToast();
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [state, setState] = useState<JobState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("enrich-rfps", { body: { action: "status" } });
    if (error) {
      toast({ title: "Could not load extraction status", description: error.message, variant: "destructive" });
    } else {
      const res = data as { coverage: Coverage; state: JobState };
      setCoverage(res.coverage);
      setState(res.state);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (action: "run" | "resume" | "requeue", label: string) => {
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-rfps", { body: { action } });
      if (error) throw error;
      const r = data as { processed?: number; values_found?: number; deadlines_recovered?: number; paused?: boolean; reason?: string; skipped?: string };
      toast({
        title: label,
        description: action === "run"
          ? (r.paused
              ? `Job is paused: ${r.reason ?? "unknown reason"}`
              : r.skipped
                ? r.skipped
                : `Read ${r.processed ?? 0} listings · ${r.values_found ?? 0} values · ${r.deadlines_recovered ?? 0} deadlines recovered.`)
          : "Done.",
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
      <section className="space-y-3 mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
      </section>
    );
  }

  if (!coverage) return null;

  const tiles = [
    { label: "Live listings", value: coverage.live_total, sub: "open or closing soon" },
    { label: "With a recorded value", value: coverage.with_value, sub: `${pct(coverage.with_value, coverage.live_total)}% of live` },
    { label: "With a deadline", value: coverage.with_deadline, sub: `${pct(coverage.with_deadline, coverage.live_total)}% of live` },
    { label: "With an official source", value: coverage.with_official_source, sub: `${pct(coverage.with_official_source, coverage.live_total)}% of live` },
  ];

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Document deep-read</h2>
          {state?.paused && <Badge variant="destructive" className="text-[10px]">Paused</Badge>}
          {state?.lease_until && new Date(state.lease_until) > new Date() && (
            <Badge variant="secondary" className="text-[10px]">Running</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={!!busy}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("requeue", "Parked listings re-queued")} disabled={!!busy || coverage.parked === 0}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Re-queue parked ({coverage.parked})
          </Button>
          {state?.paused && (
            <Button size="sm" variant="outline" onClick={() => act("resume", "Job resumed")} disabled={!!busy}>
              Resume
            </Button>
          )}
          <Button size="sm" onClick={() => act("run", "Batch complete")} disabled={!!busy}>
            {busy === "run" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            Run a batch now
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-data font-medium text-foreground">{t.value}</p>
            <p className="text-[11px] text-muted-foreground">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
        <p>Queue waiting: <span className="font-data text-foreground">{coverage.pending}</span> · read: <span className="font-data text-foreground">{coverage.done}</span> · parked: <span className="font-data text-foreground">{coverage.parked}</span></p>
        <p>Last run {relative(state?.last_run_at ?? null)} — {state?.last_run_processed ?? 0} listings, {state?.last_run_values_found ?? 0} values.</p>
        <p>Runs hourly. Values, deadlines and sources are recorded only when written in the notice or its documents.</p>
      </div>

      {state?.paused && state.paused_reason && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Paused {relative(state.paused_at)}: {state.paused_reason}
        </p>
      )}
      {!state?.paused && state?.last_run_error && (
        <p className="mt-3 text-xs text-muted-foreground">Last run note: {state.last_run_error}</p>
      )}
    </section>
  );
};

export default ValueExtractionPanel;
