import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, ArrowRight, Settings, Briefcase, Heart, TrendingUp, BookOpen, ExternalLink, Bot, MapPin, Building2, Calendar, Tag, Clock, FileEdit, Send, Eye, Trophy, XCircle, Brain, Zap, ShieldCheck } from "lucide-react";
import VerificationBadge from "@/components/VerificationBadge";
import { useVerification } from "@/hooks/useVerification";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";
import RecentApplicationsTable from "@/components/RecentApplicationsTable";
import SavedRFPsList from "@/components/SavedRFPsList";
import OutcomeLoopPanels from "@/components/OutcomeLoopPanels";
import ManagedEngagementPanel from "@/components/managed/ManagedEngagementPanel";
import { useOpportunityTracker } from "@/hooks/useOpportunityTracker";


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

interface TopMatch {
  rfp_id: string;
  match_score: number;
  rfp_title: string;
  rfp_category: string;
  rfp_org: string | null;
}

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};


const DashboardSkeleton = () => (
  <div className="container py-8">
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
  const { status: verificationStatus } = useVerification();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [totalRfps, setTotalRfps] = useState(0);
  const [matchedRfps, setMatchedRfps] = useState<RFP[]>([]);
  const [appCount, setAppCount] = useState(0);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [tendersThisWeek, setTendersThisWeek] = useState(0);
  const [scrapedRfps, setScrapedRfps] = useState<ScrapedRFP[]>([]);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({ draft: 0, submitted: 0, under_review: 0, won: 0, lost: 0 });
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const { rows: trackerRows } = useOpportunityTracker();
  const trackedCount = trackerRows.length;

  useEffect(() => {
    const fetchData = async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "tjuunlzlspznabgldvjr";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const restBase = `https://${projectId}.supabase.co/rest/v1`;
      const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

      // Fetch live opportunities (all live rows for counts, newest 20 for the feed)
      const [liveRes, scrapedRes] = await Promise.all([
        fetch(`${restBase}/scraped_rfps?select=*&status=in.(open,closing_soon)&order=deadline.asc`, { headers }),
        fetch(`${restBase}/scraped_rfps?select=*&order=scraped_at.desc&limit=20`, { headers }),
      ]);

      // Process live opportunities
      const liveRaw = liveRes.ok ? await liveRes.json() : [];
      const rfpList: RFP[] = (liveRaw as ScrapedRFP[]).map((r) => ({
        ...r,
        category: r.category ?? "Uncategorized",
        org: r.organization,
        value: r.budget,
      })) as unknown as RFP[];
      setTotalRfps(rfpList.length);
      setRfps(rfpList);
      setMatchedRfps(rfpList.slice(0, 5));

      // Process scraped RFPs
      if (scrapedRes.ok) {
        const scrapedData = await scrapedRes.json();
        setScrapedRfps(scrapedData);
        setScrapedCount(scrapedData.length);
        if (scrapedData.length > 0) {
          setLastScrapedAt(scrapedData[0].scraped_at);
        }
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekCount = scrapedData.filter((r: ScrapedRFP) => new Date(r.scraped_at).getTime() >= weekAgo).length;
        // Also query a count for the full week (in case >20 this week)
        try {
          const weekIso = new Date(weekAgo).toISOString();
          const countRes = await fetch(`${restBase}/scraped_rfps?select=id&scraped_at=gte.${weekIso}`, { headers: { ...headers, Prefer: "count=exact" } });
          const total = parseInt(countRes.headers.get("content-range")?.split("/")[1] || `${weekCount}`, 10);
          setTendersThisWeek(isNaN(total) ? weekCount : total);
        } catch {
          setTendersThisWeek(weekCount);
        }
      }

      // Fetch profile, applications & proposals only if logged in
      if (user) {
        const session = (await supabase.auth.getSession()).data.session;
        const authHeader = `Bearer ${session?.access_token || supabaseKey}`;
        const [profileRes, appRes, proposalRes] = await Promise.all([
          fetch(`${restBase}/profiles?select=expertise&user_id=eq.${user.id}&limit=1`, {
            headers: { ...headers, Authorization: authHeader },
          }),
          fetch(`${restBase}/partnership_applications?select=*&user_id=eq.${user.id}`, {
            headers: { ...headers, Prefer: "count=exact", Authorization: authHeader },
          }),
          fetch(`${restBase}/proposals?select=status&user_id=eq.${user.id}`, {
            headers: { ...headers, Authorization: authHeader },
          }),
        ]);
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          const profile = profiles[0];
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
        if (appRes.ok) {
          const countHeader = appRes.headers.get("content-range");
          const apps = await appRes.json();
          setAppCount(countHeader ? parseInt(countHeader.split("/")[1] || "0") : apps.length);
        }
        if (proposalRes.ok) {
          const proposalData: { status: string }[] = await proposalRes.json();
          const counts: Record<string, number> = { draft: 0, submitted: 0, under_review: 0, won: 0, lost: 0 };
          proposalData.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
          setProposalCounts(counts);
        }

        // Fetch top AI matches
        const { data: insights } = await supabase
          .from("ai_insights")
          .select("rfp_id, match_score")
          .eq("user_id", user.id)
          .order("match_score", { ascending: false })
          .limit(5);

        if (insights && insights.length > 0) {
          const rfpIds = insights.map((i) => i.rfp_id);
          const { data: matchedRfpData } = await supabase
            .from("scraped_rfps")
            .select("id, title, category, organization")
            .in("id", rfpIds);

          if (matchedRfpData) {
            const rfpMap = new Map(matchedRfpData.map((r) => [r.id, r]));
            setTopMatches(
              insights
                .map((i) => {
                  const r = rfpMap.get(i.rfp_id);
                  return r ? { rfp_id: i.rfp_id, match_score: i.match_score, rfp_title: r.title, rfp_category: r.category ?? "Uncategorized", rfp_org: r.organization } : null;
                })
                .filter(Boolean) as TopMatch[]
            );
          }
        }
      }


      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  const stats = [
    { label: "Active tenders", value: totalRfps + scrapedCount },
    { label: "Matched to you", value: matchedRfps.length },
    { label: "Applications", value: appCount },
    { label: "Tracked", value: trackedCount },
  ];

  const pipeline = [
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "under_review", label: "In review" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
  ] as const;

  return (
    <>
      <SEO title="Dashboard" path="/dashboard" description="Your MiddlBrand dashboard — view matched RFPs, track opportunities, and manage your company profile." />
      <section className="py-6 bg-background min-h-screen">
        <div className="container panel-enter">
          {/* Header + the actions that matter, above the fold */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="screen-title font-display font-semibold text-foreground">Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Link to="/verification" aria-label="Company verification status">
                  <VerificationBadge status={verificationStatus} />
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="h-9">
                <Link to="/rfps">Browse opportunities</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link to="/bid-studio">Bid Studio</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link to="/proposals"><FileEdit className="h-3.5 w-3.5 mr-1" /> Proposals</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link to="/verification"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verification</Link>
              </Button>
            </div>
          </div>

          {/* Secondary destinations, kept out of the way */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
            <Link to="/knowledge-base" className="text-muted-foreground hover:text-foreground">Knowledge base</Link>
            <span className="text-border">·</span>
            <Link to="/scrape" className="text-muted-foreground hover:text-foreground">Scraper</Link>
            <span className="text-border">·</span>
            <Link to="/profile" className="text-muted-foreground hover:text-foreground">Profile settings</Link>
            <span className="text-border">·</span>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground">Sign out</button>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {stats.map((s) => (
              <div key={s.label} className="app-panel">
                <p className="text-2xl font-data font-medium text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="app-panel mb-4 flex flex-wrap items-center justify-between gap-2 py-2.5">
            <p className="text-xs text-foreground">
              <span className="font-data font-medium">{tendersThisWeek.toLocaleString()}</span>{" "}
              tenders read this week across African procurement portals
            </p>
            {lastScrapedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Updated {formatRelativeTime(lastScrapedAt)}
              </span>
            )}
          </div>

          {/* Bids MiddlBrand runs on this company's behalf (renders nothing when there are none) */}
          {user && (
            <div className="mb-4">
              <ManagedEngagementPanel />
            </div>
          )}

          {/* Outcome loop: outcomes to confirm, pipeline, success fees */}
          {user && <OutcomeLoopPanels />}

          {/* Proposal pipeline — one dense strip instead of five ornamental cards */}
          {user && (
            <div className="app-panel mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">Proposal pipeline</h2>
                <Link to="/proposals" className="text-xs text-accent hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-5 divide-x divide-border">
                {pipeline.map((stage) => (
                  <div key={stage.key} className="px-2 first:pl-0">
                    <p className="text-xl font-data font-medium text-foreground">{proposalCounts[stage.key] || 0}</p>
                    <p className="text-xs text-muted-foreground">{stage.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top AI matches */}
            {user && topMatches.length > 0 && (
              <div className="app-panel">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-foreground">Top AI matches</h2>
                  <Link to="/rfps" className="text-xs text-accent hover:underline">View all</Link>
                </div>
                <div className="divide-y divide-border">
                  {topMatches.map((m) => (
                    <div key={m.rfp_id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{m.rfp_title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.rfp_category}{m.rfp_org ? ` · ${m.rfp_org}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-data font-medium text-foreground shrink-0">{m.match_score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched opportunities */}
            <div className="app-panel">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">Matched opportunities</h2>
                <Link to="/rfps" className="text-xs text-accent hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {matchedRfps.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No matched opportunities.</p>
                    <p className="text-xs mt-1">
                      <Link to="/profile" className="text-accent hover:underline">Set your expertise</Link> to see relevant RFPs.
                    </p>
                  </div>
                ) : (
                  matchedRfps.slice(0, 6).map((rfp) => (
                    <div key={rfp.id} className="py-2 min-w-0">
                      <p className="text-sm text-foreground truncate">{rfp.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rfp.category}{rfp.org ? ` · ${rfp.org}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Saved RFPs */}
            <div className="app-panel">
              <h2 className="text-sm font-semibold text-foreground mb-2">Saved RFPs</h2>
              <div className="max-h-72 overflow-y-auto">
                <SavedRFPsList />
              </div>
            </div>

            {/* Newly read tenders */}
            {scrapedRfps.length > 0 && (
              <div className="app-panel">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-foreground">Newly read tenders</h2>
                  <Link to="/scrape" className="text-xs text-accent hover:underline">Run agent</Link>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto">
                  {scrapedRfps.slice(0, 8).map((rfp) => (
                    <div key={rfp.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{rfp.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {rfp.portal}{rfp.location ? ` · ${rfp.location}` : ""}{rfp.organization ? ` · ${rfp.organization}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rfp.deadline && (
                          <span className="text-xs font-data text-muted-foreground">
                            {new Date(rfp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        <a
                          href={rfp.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open source notice"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent applications */}
            <div className="app-panel lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">Recent applications</h2>
                <Link to="/partnerships" className="text-xs text-accent hover:underline">Browse partnerships</Link>
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
