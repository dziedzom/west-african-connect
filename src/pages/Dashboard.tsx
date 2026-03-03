import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, ArrowRight, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";

const DashboardSkeleton = () => (
  <div className="container max-w-4xl py-12">
    <div className="flex items-center justify-between mb-10">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-6 w-56 mb-6" />
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  </div>
);

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [totalRfps, setTotalRfps] = useState(0);
  const [matchedRfps, setMatchedRfps] = useState<RFP[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch all open RFPs count
      const { count } = await supabase
        .from("rfps")
        .select("*", { count: "exact", head: true });
      setTotalRfps(count || 0);

      // Fetch user profile for expertise matching
      const { data: profile } = await supabase
        .from("profiles")
        .select("expertise")
        .eq("user_id", user.id)
        .single();

      // Fetch all RFPs
      const { data: allRfps } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });

      const rfpList = (allRfps || []) as RFP[];
      setRfps(rfpList);

      // Filter matched RFPs based on user expertise
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
      } else {
        setMatchedRfps(rfpList.slice(0, 5));
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  return (
    <>
    <SEO title="Dashboard" path="/dashboard" description="Your MiddlBrand dashboard — view matched RFPs, track opportunities, and manage your company profile." />
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-5 w-5 text-accent" />
              <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/profile"><Settings className="h-4 w-4 mr-1" /> Profile</Link>
            </Button>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-accent">{totalRfps}</p>
            <p className="text-xs text-muted-foreground mt-1">Active RFPs</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{matchedRfps.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Matched to Your Expertise</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">Bids Submitted</p>
          </div>
        </div>

        {/* Matched RFPs */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" /> Matched Opportunities
          </h2>
          <Link to="/rfps" className="text-sm text-accent hover:underline flex items-center gap-1">
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4">
          {matchedRfps.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No matched opportunities yet.</p>
              <p className="text-sm mt-1">
                <Link to="/profile" className="text-accent hover:underline">Set your expertise</Link> to see relevant RFPs.
              </p>
            </div>
          )}
          {matchedRfps.map((rfp) => (
            <div key={rfp.id} className="rounded-lg border border-border bg-card p-5 hover:border-accent/40 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{rfp.title}</h3>
                  <p className="text-sm text-muted-foreground">{rfp.org}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{rfp.category}</Badge>
                    {rfp.location && <Badge variant="outline">{rfp.location}</Badge>}
                    {rfp.value && <Badge variant="outline">{rfp.value}</Badge>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-semibold text-foreground">{rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "TBD"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
