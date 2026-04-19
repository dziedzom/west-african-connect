import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, ArrowRight, Settings, Briefcase, Heart, TrendingUp, BookOpen, ExternalLink, Bot, MapPin, Building2, Calendar, Tag, Clock, FileEdit, Send, Eye, Trophy, XCircle, Brain, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";
import RecentApplicationsTable from "@/components/RecentApplicationsTable";
import SavedRFPsList from "@/components/SavedRFPsList";


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
  const [scrapedCount, setScrapedCount] = useState(0);
  const [tendersThisWeek, setTendersThisWeek] = useState(0);
  const [scrapedRfps, setScrapedRfps] = useState<ScrapedRFP[]>([]);
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({ draft: 0, submitted: 0, under_review: 0, won: 0, lost: 0 });
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "tjuunlzlspznabgldvjr";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const restBase = `https://${projectId}.supabase.co/rest/v1`;
      const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

      // Fetch local RFPs and scraped RFPs in parallel
      const [rfpRes, scrapedRes] = await Promise.all([
        fetch(`${restBase}/rfps?select=*&order=created_at.desc`, { headers }),
        fetch(`${restBase}/scraped_rfps?select=*&order=scraped_at.desc&limit=20`, { headers }),
      ]);

      // Process local RFPs
      const rfpList: RFP[] = rfpRes.ok ? await rfpRes.json() : [];
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
            .from("rfps")
            .select("id, title, category, org")
            .in("id", rfpIds);

          if (matchedRfpData) {
            const rfpMap = new Map(matchedRfpData.map((r) => [r.id, r]));
            setTopMatches(
              insights
                .map((i) => {
                  const r = rfpMap.get(i.rfp_id);
                  return r ? { rfp_id: i.rfp_id, match_score: i.match_score, rfp_title: r.title, rfp_category: r.category, rfp_org: r.org } : null;
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

  const savedCount = (() => {
    try {
      const stored = localStorage.getItem("savedRfps");
      return stored ? JSON.parse(stored).length : 0;
    } catch { return 0; }
  })();

  const stats = [
    { label: "Active RFPs", value: totalRfps + scrapedCount, icon: FileText, accent: true },
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
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/proposals"><FileEdit className="h-4 w-4 mr-1" /> Proposals</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/scrape"><Bot className="h-4 w-4 mr-1" /> Scraper</Link>
              </Button>
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

          {/* Proposal Pipeline */}
          {user && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-accent" /> Proposal Pipeline
                </h2>
                <Link to="/proposals" className="text-[10px] text-accent hover:underline flex items-center gap-1 font-body">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {([
                  { key: "draft", label: "Draft", icon: FileEdit, color: "text-muted-foreground" },
                  { key: "submitted", label: "Submitted", icon: Send, color: "text-accent" },
                  { key: "under_review", label: "Review", icon: Eye, color: "text-amber-600" },
                  { key: "won", label: "Won", icon: Trophy, color: "text-emerald-500" },
                  { key: "lost", label: "Lost", icon: XCircle, color: "text-destructive" },
                ] as const).map((stage) => (
                  <div key={stage.key} className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center hover:border-accent/30 transition-all">
                    <stage.icon className={`h-4 w-4 mx-auto mb-1.5 ${stage.color}`} />
                    <p className="text-xl font-display font-bold text-foreground">{proposalCounts[stage.key] || 0}</p>
                    <p className="text-[9px] text-muted-foreground font-body uppercase tracking-wider mt-0.5">{stage.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top AI Matches */}
          {user && topMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" /> Top AI Matches
                </h2>
                <Link to="/rfps" className="text-[10px] text-accent hover:underline flex items-center gap-1 font-body">
                  View all RFPs <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topMatches.map((m) => {
                  const scoreColor = m.match_score >= 75 ? "text-accent" : m.match_score >= 50 ? "text-amber-500" : "text-destructive";
                  return (
                    <div key={m.rfp_id} className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-foreground truncate">{m.rfp_title}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px]">{m.rfp_category}</Badge>
                            {m.rfp_org && <span className="text-[10px] text-muted-foreground truncate">{m.rfp_org}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <Zap className={`h-4 w-4 ${scoreColor}`} />
                          <span className={`text-lg font-display font-bold ${scoreColor}`}>{m.match_score}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">match</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Scraped RFPs from AI Agent */}
          {scrapedRfps.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-accent" /> AI-Scraped Opportunities
                </h2>
                <div className="flex items-center gap-3">
                  {lastScrapedAt && (
                    <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last scraped {formatRelativeTime(lastScrapedAt)}
                    </span>
                  )}
                  <Link to="/scrape" className="text-[10px] text-accent hover:underline flex items-center gap-1 font-body">
                    Run scraper <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scrapedRfps.slice(0, 6).map((rfp) => (
                  <div
                    key={rfp.id}
                    className="group rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 flex flex-col justify-between transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
                  >
                    <div className="mb-4">
                      <h3 className="text-sm font-display font-semibold text-foreground leading-snug line-clamp-2">
                        {rfp.title}
                      </h3>
                      {rfp.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">{rfp.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">{rfp.portal}</Badge>
                        {rfp.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Tag className="h-2.5 w-2.5 mr-0.5" />{rfp.category}
                          </Badge>
                        )}
                        {rfp.location && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />{rfp.location}
                          </span>
                        )}
                        {rfp.organization && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Building2 className="h-2.5 w-2.5" />{rfp.organization}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-muted-foreground font-body">
                          Scraped {new Date(rfp.scraped_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                        {rfp.deadline && (
                          <p className="text-[10px] font-semibold text-destructive font-body flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(rfp.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" className="w-full rounded-full mt-auto bg-accent text-accent-foreground hover:bg-accent/90">
                      <a href={rfp.source_url} target="_blank" rel="noopener noreferrer">
                        View RFP <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
              {scrapedRfps.length > 6 && (
                <div className="text-center mt-3">
                  <Link to="/scrape" className="text-xs text-accent hover:underline font-body">
                    View all {scrapedCount} scraped RFPs →
                  </Link>
                </div>
              )}
            </div>
          )}

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
