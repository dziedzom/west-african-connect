import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Search, AlertCircle, CheckCircle2, Clock, Globe } from "lucide-react";
import SEO from "@/components/SEO";

interface Site { siteUrl: string; permissionLevel: string }
interface SitemapEntry {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  errors?: string;
  warnings?: string;
  contents?: Array<{ type: string; submitted: string; indexed: string }>;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export default function IndexingStatus() {
  const { toast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [sitemaps, setSitemaps] = useState<SitemapEntry[]>([]);
  const [inspection, setInspection] = useState<any>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectInput, setInspectInput] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoadingSites(true);
      const { data, error } = await supabase.functions.invoke("gsc-indexing", { body: { action: "sites" } });
      setLoadingSites(false);
      if (error) { toast({ title: "Failed to load sites", description: error.message, variant: "destructive" }); return; }
      const s: Site[] = data?.siteEntry || [];
      setSites(s);
      const preferred = s.find((x) => x.siteUrl.includes("middlbrand.com")) || s[0];
      if (preferred) setSelected(preferred.siteUrl);
    })();
  }, []);

  async function loadOverview(siteUrl: string) {
    setLoadingOverview(true);
    setSitemaps([]); setInspection(null); setInspectError(null);
    const { data, error } = await supabase.functions.invoke("gsc-indexing", { body: { action: "overview", siteUrl } });
    setLoadingOverview(false);
    if (error) { toast({ title: "Failed to load overview", description: error.message, variant: "destructive" }); return; }
    setSitemaps(data?.sitemaps?.sitemap || []);
    if (data?.inspection?.error) setInspectError(data.inspection.error);
    else setInspection(data?.inspection?.inspectionResult || null);
  }

  useEffect(() => { if (selected) loadOverview(selected); }, [selected]);

  async function runInspect() {
    if (!inspectInput || !selected) return;
    setInspecting(true); setInspectResult(null);
    const { data, error } = await supabase.functions.invoke("gsc-indexing", {
      body: { action: "inspect", siteUrl: selected, url: inspectInput },
    });
    setInspecting(false);
    if (error) { toast({ title: "Inspect failed", description: error.message, variant: "destructive" }); return; }
    setInspectResult(data?.inspectionResult || data);
  }

  const totals = sitemaps.reduce(
    (acc, s) => {
      acc.errors += Number(s.errors || 0);
      acc.warnings += Number(s.warnings || 0);
      (s.contents || []).forEach((c) => {
        acc.submitted += Number(c.submitted || 0);
        acc.indexed += Number(c.indexed || 0);
      });
      return acc;
    },
    { errors: 0, warnings: 0, submitted: 0, indexed: 0 }
  );

  const indexStatus = inspection?.indexStatusResult;
  const lastCrawl = indexStatus?.lastCrawlTime;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <SEO title="Indexing Status | Middlbrand" description="Google Search Console indexing coverage and last crawl status." />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Indexing Status</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coverage issues and last crawl times from Google Search Console.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected} disabled={loadingSites || !sites.length}>
            <SelectTrigger className="w-[320px]"><SelectValue placeholder={loadingSites ? "Loading sites..." : "Select a site"} /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => selected && loadOverview(selected)} disabled={!selected || loadingOverview} aria-label="Refresh">
            {loadingOverview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!loadingSites && !sites.length && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No verified sites found in your Google Search Console account.</CardContent></Card>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Globe className="h-4 w-4" />} label="Submitted URLs" value={totals.submitted} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Indexed URLs" value={totals.indexed} />
            <StatCard icon={<AlertCircle className="h-4 w-4 text-destructive" />} label="Sitemap Errors" value={totals.errors} tone={totals.errors ? "destructive" : "default"} />
            <StatCard icon={<AlertCircle className="h-4 w-4 text-yellow-600" />} label="Sitemap Warnings" value={totals.warnings} tone={totals.warnings ? "warning" : "default"} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Homepage Crawl</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {inspectError && <p className="text-destructive">{inspectError}</p>}
              {!inspectError && !indexStatus && loadingOverview && <p className="text-muted-foreground">Loading…</p>}
              {indexStatus && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Row label="Last crawl time" value={fmtDate(lastCrawl)} />
                  <Row label="Coverage state" value={indexStatus.coverageState || "—"} />
                  <Row label="Indexing state" value={indexStatus.indexingState || "—"} />
                  <Row label="Verdict" value={indexStatus.verdict || "—"} />
                  <Row label="Crawled as" value={indexStatus.crawledAs || "—"} />
                  <Row label="Robots.txt state" value={indexStatus.robotsTxtState || "—"} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Sitemaps & Coverage Issues</CardTitle></CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : sitemaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sitemaps submitted for this site.</p>
              ) : (
                <div className="space-y-3">
                  {sitemaps.map((sm) => {
                    const errors = Number(sm.errors || 0);
                    const warnings = Number(sm.warnings || 0);
                    const submitted = (sm.contents || []).reduce((a, c) => a + Number(c.submitted || 0), 0);
                    const indexed = (sm.contents || []).reduce((a, c) => a + Number(c.indexed || 0), 0);
                    return (
                      <div key={sm.path} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a href={sm.path} target="_blank" rel="noreferrer" className="break-all text-sm font-medium hover:underline">{sm.path}</a>
                          <div className="flex flex-wrap items-center gap-2">
                            {sm.isPending && <Badge variant="secondary">Pending</Badge>}
                            {errors > 0 && <Badge variant="destructive">{errors} error{errors === 1 ? "" : "s"}</Badge>}
                            {warnings > 0 && <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/15">{warnings} warning{warnings === 1 ? "" : "s"}</Badge>}
                            {errors === 0 && warnings === 0 && !sm.isPending && <Badge variant="outline" className="text-green-700">Healthy</Badge>}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                          <div><span className="font-medium text-foreground">Last submitted:</span> {fmtDate(sm.lastSubmitted)}</div>
                          <div><span className="font-medium text-foreground">Last downloaded:</span> {fmtDate(sm.lastDownloaded)}</div>
                          <div><span className="font-medium text-foreground">Submitted URLs:</span> {submitted}</div>
                          <div><span className="font-medium text-foreground">Indexed URLs:</span> {indexed}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Inspect any URL</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={inspectInput}
                  onChange={(e) => setInspectInput(e.target.value)}
                  placeholder={`${selected}some/page`}
                  aria-label="URL to inspect"
                />
                <Button onClick={runInspect} disabled={!inspectInput || inspecting}>
                  {inspecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Inspect
                </Button>
              </div>
              {inspectResult?.indexStatusResult && (
                <div className="grid grid-cols-1 gap-2 rounded-lg border p-4 text-sm md:grid-cols-2">
                  <Row label="Last crawl time" value={fmtDate(inspectResult.indexStatusResult.lastCrawlTime)} />
                  <Row label="Coverage state" value={inspectResult.indexStatusResult.coverageState || "—"} />
                  <Row label="Indexing state" value={inspectResult.indexStatusResult.indexingState || "—"} />
                  <Row label="Verdict" value={inspectResult.indexStatusResult.verdict || "—"} />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: number | string; tone?: "default" | "destructive" | "warning" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className={`mt-2 text-2xl font-medium ${tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-yellow-700" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
