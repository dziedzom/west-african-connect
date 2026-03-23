import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Play, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle, Loader2, Calendar, MapPin, Building2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";

const DEFAULT_PORTALS = [
  { name: "UNGM", label: "UN Global Marketplace", url: "https://www.ungm.org/Public/Notice" },
  { name: "AfDB", label: "African Development Bank", url: "https://www.afdb.org/en/about-us/corporate-procurement/current-opportunities" },
  { name: "SA eTenders", label: "South Africa eTenders", url: "https://www.etenders.gov.za/content/advertised-tenders.html" },
];

interface ScrapedRFP {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  category: string | null;
  budget: string | null;
  location: string | null;
  organization: string | null;
  source_url: string;
  portal: string;
  scraped_at: string;
}

interface ScrapeResult {
  portal: string;
  url: string;
  rfps_found: number;
  error?: string;
}

const ScrapeAgent = () => {
  const { toast } = useToast();
  const [selectedPortals, setSelectedPortals] = useState<string[]>(["UNGM", "AfDB", "SA eTenders"]);
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<ScrapeResult[] | null>(null);
  const [scrapedRfps, setScrapedRfps] = useState<ScrapedRFP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScrapedRfps();
  }, []);

  const fetchScrapedRfps = async () => {
    const { data, error } = await supabase
      .from("scraped_rfps")
      .select("*")
      .order("scraped_at", { ascending: false })
      .limit(50);

    if (!error && data) setScrapedRfps(data as ScrapedRFP[]);
    setLoading(false);
  };

  const togglePortal = (name: string) => {
    setSelectedPortals((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const addCustomUrl = () => {
    const url = newUrl.trim();
    if (url && !customUrls.includes(url)) {
      setCustomUrls((prev) => [...prev, url.startsWith("http") ? url : `https://${url}`]);
      setNewUrl("");
    }
  };

  const removeCustomUrl = (url: string) => {
    setCustomUrls((prev) => prev.filter((u) => u !== url));
  };

  const runScraper = async () => {
    if (selectedPortals.length === 0 && customUrls.length === 0) {
      toast({ title: "No targets", description: "Select at least one portal or add a custom URL.", variant: "destructive" });
      return;
    }

    setScraping(true);
    setResults(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "tjuunlzlspznabgldvjr";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/scrape-rfps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          portals: selectedPortals,
          urls: customUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Scrape failed", description: data.error || `Error ${res.status}`, variant: "destructive" });
      } else {
        setResults(data.results || []);
        toast({
          title: "Scrape complete",
          description: `Found ${data.total_rfps_found} RFPs across ${data.results?.length || 0} portals.`,
        });
        fetchScrapedRfps();
      }
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  return (
    <>
      <SEO title="RFP Scraping Agent" path="/scrape" description="AI-powered agent that scrapes procurement portals across Africa to find RFP opportunities." />
      <section className="py-12 bg-background min-h-screen">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">RFP Scraping Agent</h1>
              <p className="text-sm text-muted-foreground font-body">AI-powered extraction from procurement portals across Africa</p>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-6">
            <h2 className="text-sm font-display font-bold text-foreground mb-4">Target Portals</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {DEFAULT_PORTALS.map((portal) => (
                <label
                  key={portal.name}
                  className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedPortals.includes(portal.name)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedPortals.includes(portal.name)}
                    onCheckedChange={() => togglePortal(portal.name)}
                  />
                  <div>
                    <p className="text-sm font-display font-semibold text-foreground">{portal.name}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{portal.label}</p>
                  </div>
                </label>
              ))}
            </div>

            <h2 className="text-sm font-display font-bold text-foreground mb-3">Custom URLs</h2>
            <div className="flex gap-2 mb-3">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://procurement-portal.gov.xx/tenders"
                onKeyDown={(e) => e.key === "Enter" && addCustomUrl()}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={addCustomUrl}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {customUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {customUrls.map((url) => (
                  <Badge key={url} variant="secondary" className="flex items-center gap-1 text-xs">
                    {new URL(url).hostname}
                    <Trash2 className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeCustomUrl(url)} />
                  </Badge>
                ))}
              </div>
            )}

            <Button
              onClick={runScraper}
              disabled={scraping}
              className="w-full sm:w-auto rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {scraping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping portals...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Scraper
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-6">
              <h2 className="text-sm font-display font-bold text-foreground mb-4">Scrape Results</h2>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      {r.error ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-display font-semibold text-foreground">{r.portal}</p>
                        {r.error && <p className="text-[10px] text-destructive font-body">{r.error}</p>}
                      </div>
                    </div>
                    <Badge variant={r.error ? "destructive" : "secondary"}>
                      {r.rfps_found} RFPs
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scraped RFPs */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display font-bold text-foreground">
                Scraped RFPs ({scrapedRfps.length})
              </h2>
              <Button variant="outline" size="sm" className="rounded-full" onClick={fetchScrapedRfps}>
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : scrapedRfps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No scraped RFPs yet. Run the scraper to start collecting opportunities.
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {scrapedRfps.map((rfp) => (
                  <div key={rfp.id} className="rounded-lg border border-border bg-background/50 p-4 hover:border-accent/30 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-display font-semibold text-foreground leading-snug line-clamp-2">
                          {rfp.title}
                        </h3>
                        {rfp.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">{rfp.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">{rfp.portal}</Badge>
                          {rfp.category && <Badge variant="secondary" className="text-[10px]"><Tag className="h-2.5 w-2.5 mr-1" />{rfp.category}</Badge>}
                          {rfp.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />{rfp.location}
                            </span>
                          )}
                          {rfp.organization && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-2.5 w-2.5" />{rfp.organization}
                            </span>
                          )}
                          {rfp.deadline && (
                            <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(rfp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {rfp.budget && (
                            <span className="text-[10px] text-muted-foreground">{rfp.budget}</span>
                          )}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
                        <a href={rfp.source_url} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default ScrapeAgent;
