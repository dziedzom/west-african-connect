import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, ArrowRight, Settings, Briefcase, Heart, TrendingUp, BookOpen, ExternalLink, AlertCircle, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";
import RecentApplicationsTable from "@/components/RecentApplicationsTable";
import SavedRFPsList from "@/components/SavedRFPsList";

interface ExternalRFP {
  id: string;
  title: string;
  source_url: string;
  created_at: string;
}

const parseExternalRFP = (title: string) => {
  const deadlineMatch = title.match(/Deadline\s+(.+?)$/i);
  const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;

  // Format: "WD-XXXXX - Location - Services - Deadline ..."
  const parts = title.split(" - ");
  const category = parts.length >= 3 ? parts.slice(2, -1).join(" - ").replace(/\s*-?\s*Deadline.*$/i, "").trim() : null;
  const location = parts.length >= 2 ? parts[1].trim() : null;

  return { deadline, category, location };
};

const DashboardSkeleton = () => (
  <div className="container max-w-6xl py-12">
    <div className="flex items-center justify-between mb-10">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-64 rounded-xl md:col-span-2" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [totalRfps, setTotalRfps] = useState(0);
  const [matchedRfps, setMatchedRfps] = useState<RFP[]>([]);
  const [appCount, setAppCount] = useState(0);
  const [externalRfps, setExternalRfps] = useState<ExternalRFP[]>([]);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [scrapedCount, setScrapedCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch local data (public tables don't need auth)
      const [{ count: rfpCount }, { data: allRfps }, { count: scrapedRfpCount }] = await Promise.all([
        supabase.from("rfps").select("*", { count: "exact", head: true }),
        supabase.from("rfps").select("*").order("created_at", { ascending: false }),
        supabase.from("scraped_rfps").select("*", { count: "exact", head: true }),
      ]);

      const rfpList = (allRfps || []) as RFP[];
      setTotalRfps(rfpCount || 0);
      setRfps(rfpList);
      setMatchedRfps(rfpList.slice(0, 5));

      // Fetch profile & applications only if logged in
      if (user) {
        const [{ data: profile }, { count: applicationCount }] = await Promise.all([
          supabase.from("profiles").select("expertise").eq("user_id", user.id).single(),
          supabase.from("partnership_applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        setAppCount(applicationCount || 0);
        if (profile?.expertise) {
          const expertiseMap: Record<string, string[]> = {
            "Pharmaceuticals": ["Pharma"],
            "Transport & Logistics": ["Transport"],
            "Construction": ["Construction"],
            "IT & Tech": ["IT"],
            "Agriculture": ["Agriculture"],
            "Energy": ["Energy"],
            "Consulting": ["IT", "Pharma", "Energy"],
            "Manufacturing": ["Agriculture", "Construction"],
          };
          const matchCategories = expertiseMap[profile.expertise] || [];
          setMatchedRfps(rfpList.filter((r) => matchCategories.includes(r.category)));
        }
      }

      // Fetch external RFP opportunities (no auth needed)
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "tjuunlzlspznabgldvjr";
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/fetch-external-rfps`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });
        if (!res.ok) {
          const errBody = await res.text();
          setExternalError(`Edge function error (${res.status}): ${errBody}`);
        } else {
          const fnData = await res.json();
          if (fnData?.error) {
            setExternalError(fnData.error);
          } else if (Array.isArray(fnData)) {
            setExternalRfps(fnData);
          } else {
            setExternalError("Unexpected response format from edge function");
          }
        }
      } catch (err: unknown) {
        setExternalError(err instanceof Error ? err.message : "Unknown error fetching external RFPs");
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  const savedCount = (() => {
    try {
      const stored = localStorage.getItem("savedRfps");
      return stored ? JSON.parse(stored).length : 0;
    } catch { return 0; }
  })();

  const stats = [
    { label: "Active RFPs", value: totalRfps + externalRfps.length + scrapedCount, icon: FileText, accent: true },
    { label: "Matched", value: matchedRfps.length, icon: TrendingUp, accent: false },
    { label: "Applications", value: appCount, icon: Briefcase, accent: false },
    { label: "Saved", value: savedCount, icon: Heart, accent: false },
  ];

  return (
    <>
      <SEO title="Dashboard" path="/dashboard" description="Your MiddlBrand dashboard — view matched RFPs, track opportunities, and manage your company profile." />
      <section className="py-12 bg-background min-h-screen grain-mesh">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-5 w-5 text-accent" />
                <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
              </div>
              <p className="text-sm text-muted-foreground font-body">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/knowledge-base"><BookOpen className="h-4 w-4 mr-1" /> Knowledge</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/profile"><Settings className="h-4 w-4 mr-1" /> Profile</Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={signOut}>Sign Out</Button>
            </div>
          </div>

          {/* Bento Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 text-center transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
              >
                <s.icon className={`h-4 w-4 mx-auto mb-2 ${s.accent ? "text-accent" : "text-muted-foreground"}`} />
                <p className={`text-2xl font-display font-bold ${s.accent ? "text-accent" : "text-foreground"}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-body uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* External RFP Opportunities */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-accent" /> RFP Opportunities
              </h2>
              {externalRfps.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">
                  {externalRfps.length} {externalRfps.length === 1 ? "opportunity" : "opportunities"}
                </span>
              )}
            </div>

            {externalError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-semibold text-destructive">Failed to load external RFPs</p>
                  <p className="text-xs text-muted-foreground mt-1 font-body break-all">{externalError}</p>
                </div>
              </div>
            )}

            {externalRfps.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {externalRfps.map((opp) => {
                  const parsed = parseExternalRFP(opp.title);
                  return (
                    <div
                      key={opp.id}
                      className="group rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 flex flex-col justify-between transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
                    >
                      <div className="mb-4">
                        <h3 className="text-sm font-display font-semibold text-foreground leading-snug line-clamp-3">
                          {opp.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {parsed.category && (
                            <Badge variant="secondary" className="text-[10px]">{parsed.category}</Badge>
                          )}
                          {parsed.location && (
                            <Badge variant="outline" className="text-[10px]">{parsed.location}</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[10px] text-muted-foreground font-body">
                            Added {new Date(opp.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          {parsed.deadline && (
                            <p className="text-[10px] font-semibold text-destructive font-body">
                              ⏰ {parsed.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button asChild size="sm" className="w-full rounded-full mt-auto bg-accent text-accent-foreground hover:bg-accent/90">
                        <a href={opp.source_url} target="_blank" rel="noopener noreferrer">
                          View RFP <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {!externalError && externalRfps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No external RFP opportunities found.</p>
            )}
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matched Opportunities */}
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 md:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> Matched Opportunities
                </h2>
                <Link to="/rfps" className="text-[10px] text-accent hover:underline flex items-center gap-1 font-body">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {matchedRfps.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">No matched opportunities.</p>
                    <p className="text-xs mt-1">
                      <Link to="/profile" className="text-accent hover:underline">Set your expertise</Link> to see relevant RFPs.
                    </p>
                  </div>
                ) : (
                  matchedRfps.slice(0, 5).map((rfp) => (
                    <div key={rfp.id} className="rounded-lg border border-border bg-background/50 p-3 hover:border-accent/30 transition-all">
                      <p className="text-sm font-display font-semibold text-foreground truncate">{rfp.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px]">{rfp.category}</Badge>
                        {rfp.org && <span className="text-[10px] text-muted-foreground">{rfp.org}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Saved RFPs */}
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-accent" /> Saved RFPs
                </h2>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <SavedRFPsList />
              </div>
            </div>

            {/* Recent Applications - full width */}
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-accent" /> Recent Applications
                </h2>
                <Link to="/partnerships" className="text-[10px] text-accent hover:underline flex items-center gap-1 font-body">
                  Browse partnerships <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <RecentApplicationsTable />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
