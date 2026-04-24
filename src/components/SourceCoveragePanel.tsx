import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, AlertCircle, PauseCircle, Loader2 } from "lucide-react";

interface SourceRow {
  id: string;
  name: string;
  domain: string;
  category: string;
  priority: number;
  enabled: boolean;
  auto_disabled_until: string | null;
  consecutive_failures: number;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  total_runs: number;
  successful_runs: number;
}

const SourceCoveragePanel = () => {
  const { toast } = useToast();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, { all: number; week: number }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("scrape_sources").select("*").order("priority").order("name");
    setSources((data as SourceRow[]) || []);

    const { data: rows } = await supabase
      .from("scraped_rfps")
      .select("source_domain, scraped_at")
      .not("source_domain", "is", null)
      .limit(5000);
    const sevenDaysAgo = Date.now() - 7 * 86400_000;
    const c: Record<string, { all: number; week: number }> = {};
    for (const r of (rows as { source_domain: string; scraped_at: string }[]) || []) {
      const k = r.source_domain;
      if (!c[k]) c[k] = { all: 0, week: 0 };
      c[k].all++;
      if (new Date(r.scraped_at).getTime() >= sevenDaysAgo) c[k].week++;
    }
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runOne = async (s: SourceRow) => {
    setRunning(s.id);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-rfps", {
        body: { source_domain: s.domain, include_disabled: true },
      });
      if (error) throw error;
      toast({ title: `${s.name} scraped`, description: `${data?.total_rfps_found ?? 0} new · ${data?.total_deduped ?? 0} deduped` });
      await load();
    } catch (e) {
      toast({ title: "Scrape failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-display font-bold text-foreground">Source Coverage</h2>
        <Button variant="outline" size="sm" className="rounded-full" onClick={load}>Refresh</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sources.map((s) => {
            const disabled = s.auto_disabled_until && new Date(s.auto_disabled_until) > new Date();
            const successRate = s.total_runs > 0 ? Math.round((s.successful_runs / s.total_runs) * 100) : null;
            const c = counts[s.domain] || { all: 0, week: 0 };
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {disabled ? <PauseCircle className="h-4 w-4 text-destructive shrink-0" />
                    : s.last_error ? <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-display font-semibold text-foreground truncate">{s.name}</p>
                      <Badge variant="outline" className="text-[9px]">P{s.priority}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{s.category}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body">
                      {s.domain} · last success {fmt(s.last_success_at)} · {c.all} total, {c.week} this week
                      {successRate !== null && ` · ${successRate}% success`}
                      {disabled && ` · auto-disabled until ${fmt(s.auto_disabled_until)}`}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-full shrink-0" disabled={running === s.id} onClick={() => runOne(s)}>
                  {running === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Play className="h-3 w-3 mr-1" /> Run</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SourceCoveragePanel;
