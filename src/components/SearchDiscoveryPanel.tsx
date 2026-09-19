import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, Search, ExternalLink, Check, X, Plus } from "lucide-react";

interface DiscoveryState {
  rotation_cursor: number;
  max_queries_per_run: number;
  results_per_query: number;
  freshness: string;
  paused: boolean;
  paused_reason: string | null;
  last_run_at: string | null;
  last_run_error: string | null;
}

interface DiscoveryResult {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
  query_text: string;
  sector: string | null;
  country: string | null;
  created_at: string;
}

interface Candidate {
  id: string;
  domain: string;
  positive_hits: number;
  rejected_hits: number;
  not_tender_hits: number;
  threshold: number;
  sample_titles: string[];
  sample_urls: string[];
  queries: string[];
  countries: string[];
  first_seen_at: string;
  last_seen_at: string;
  existing_source_id: string | null;
}

interface Run {
  id: string;
  started_at: string;
  queries_issued: number;
  results_returned: number;
  results_kept: number;
  duplicates_dropped: number;
  excluded_dropped: number;
  candidates_surfaced: number;
  est_search_cost_usd: number;
  error: string | null;
}

interface StatusPayload {
  state: DiscoveryState | null;
  key_configured: boolean;
  pending: DiscoveryResult[];
  candidates: Candidate[];
  runs: Run[];
  month_to_date: { queries: number; cost: number };
  published_from_search: number;
}

const relative = (iso: string | null) => {
  if (!iso) return "never";
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m ago`;
  if (mins < 2880) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

const SearchDiscoveryPanel = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("discover-search", { body: { action: "status" } });
    if (error) {
      toast({ title: "Could not load discovery status", description: error.message, variant: "destructive" });
    } else {
      setStatus(data as StatusPayload);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const call = async (body: Record<string, unknown>, key: string, label: string) => {
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke("discover-search", { body });
      if (error) throw error;
      const r = data as Record<string, any>;
      if (r?.error) throw new Error(r.error);
      toast({
        title: label,
        description: body.action === "run"
          ? `${r.queries_issued} searches, ${r.results_kept} kept, ${r.duplicates_dropped} duplicates, ${r.candidates_surfaced} new candidate portals. Est. cost $${r.est_search_cost_usd}.`
          : undefined,
      });
      await load();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const state = status?.state;

  return (
    <div className="border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Search className="h-4 w-4" /> Search discovery
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily web searches for procurement wording. Nothing publishes without your approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          {state?.paused && (
            <Button variant="outline" size="sm" onClick={() => call({ action: "resume" }, "resume", "Discovery resumed")} disabled={busy !== null}>
              Resume
            </Button>
          )}
          <Button size="sm" onClick={() => call({ action: "run" }, "run", "Discovery run finished")} disabled={busy !== null}>
            {busy === "run" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5" />}
            Run a search now
          </Button>
        </div>
      </div>

      {loading && !status ? (
        <div className="mt-5 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {!status?.key_configured && (
            <p className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-sm">
              The search key isn't configured, so runs can't start.
            </p>
          )}
          {state?.paused && (
            <p className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-sm">
              Paused: {state.paused_reason}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Awaiting review", value: status?.pending.length ?? 0 },
              { label: "Candidate portals", value: status?.candidates.length ?? 0 },
              { label: "Published from search", value: status?.published_from_search ?? 0 },
              { label: "Cost this month", value: `$${(status?.month_to_date.cost ?? 0).toFixed(2)}` },
            ].map((s) => (
              <div key={s.label} className="border border-border p-3">
                <p className="font-data text-xl">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last run {relative(state?.last_run_at ?? null)} · {status?.month_to_date.queries ?? 0} searches this month ·
            {" "}{state?.max_queries_per_run ?? 60} per run
          </p>

          {/* Candidate portals — the valuable output */}
          <div className="mt-7" id="discovery-candidates">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Candidate portals</h3>
            {(status?.candidates.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None yet. A domain surfaces once it produces enough positive tender hits.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {status!.candidates.map((c) => (
                  <div key={c.id} className="border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-data text-sm">{c.domain}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {c.positive_hits} tender hits (threshold {c.threshold}) · {c.countries.join(", ")} ·
                          {" "}first seen {relative(c.first_seen_at)}
                          {(c.rejected_hits > 0 || c.not_tender_hits > 0) && (
                            <> · {c.rejected_hits} rejected, {c.not_tender_hits} not a tender (for information only)</>
                          )}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {c.sample_titles.slice(0, 3).map((t, i) => (
                            <li key={i} className="truncate text-muted-foreground">{t}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => call({ action: "add_source", id: c.id }, `add-${c.id}`, "Added to the scraper")} disabled={busy !== null}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add to scraper
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => call({ action: "dismiss_candidate", id: c.id }, `dis-${c.id}`, "Dismissed")} disabled={busy !== null}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual tenders awaiting review */}
          <div className="mt-7">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tenders found</h3>
            {(status?.pending.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing waiting for review.</p>
            ) : (
              <div className="mt-3 divide-y divide-border border border-border">
                {status!.pending.map((r) => (
                  <div key={r.id} id={`discovery-${r.id}`} className="scroll-mt-24 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="mt-1 font-data text-xs text-muted-foreground">
                          {r.domain}{r.country ? ` · ${r.country}` : ""}{r.sector ? ` · ${r.sector}` : ""}
                        </p>
                        {r.snippet && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{r.snippet}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">Found by: {r.query_text}</p>
                        <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline">
                          Open the original page <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button size="sm" onClick={() => call({ action: "approve", id: r.id }, `ap-${r.id}`, "Published")} disabled={busy !== null}>
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => call({ action: "reject", id: r.id }, `rj-${r.id}`, "Rejected")} disabled={busy !== null}>
                          <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => call({ action: "reject", id: r.id, not_tender: true }, `nt-${r.id}`, "Marked as not a tender")} disabled={busy !== null}>
                          Not a tender
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run history */}
          {(status?.runs.length ?? 0) > 0 && (
            <div className="mt-7">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent runs</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="h-9 pr-3 font-semibold">When</th>
                      <th className="h-9 pr-3 font-semibold">Searches</th>
                      <th className="h-9 pr-3 font-semibold">Results</th>
                      <th className="h-9 pr-3 font-semibold">Kept</th>
                      <th className="h-9 pr-3 font-semibold">Duplicates</th>
                      <th className="h-9 pr-3 font-semibold">Dropped</th>
                      <th className="h-9 pr-3 font-semibold">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status!.runs.map((r) => (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-data text-xs">{relative(r.started_at)}</td>
                        <td className="py-2 pr-3 font-data text-xs">{r.queries_issued}</td>
                        <td className="py-2 pr-3 font-data text-xs">{r.results_returned}</td>
                        <td className="py-2 pr-3 font-data text-xs">{r.results_kept}</td>
                        <td className="py-2 pr-3 font-data text-xs">{r.duplicates_dropped}</td>
                        <td className="py-2 pr-3 font-data text-xs">{r.excluded_dropped}</td>
                        <td className="py-2 pr-3 font-data text-xs">${Number(r.est_search_cost_usd).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchDiscoveryPanel;
