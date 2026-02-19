import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, FileText, ArrowRight } from "lucide-react";

const matchedRFPs = [
  { id: 1, title: "Supply of Pharmaceutical Products", org: "Ghana Health Service", category: "Pharma", location: "Ghana", value: "$100k–$200k", deadline: "2026-03-15", status: "New" },
  { id: 5, title: "IT Infrastructure Upgrade", org: "Accra Digital Centre", category: "IT", location: "Ghana", value: "$100k–$200k", deadline: "2026-03-20", status: "Reviewed" },
  { id: 3, title: "Solar Panel Installation", org: "ECOWAS Energy Fund", category: "Energy", location: "Senegal", value: "$500k+", deadline: "2026-03-28", status: "New" },
];

const DashboardSkeleton = () => (
  <div className="container max-w-4xl py-12">
    <div className="flex items-center justify-between mb-10">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-4 mb-10">
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

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
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
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-accent">3</p>
            <p className="text-xs text-muted-foreground mt-1">Matched RFPs</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-foreground">1</p>
            <p className="text-xs text-muted-foreground mt-1">Bids Submitted</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-center">
            <p className="text-2xl font-display font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">Contracts Won</p>
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
          {matchedRFPs.map((rfp) => (
            <div key={rfp.id} className="rounded-lg border border-border bg-card p-5 hover:border-accent/40 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-foreground">{rfp.title}</h3>
                    <Badge variant={rfp.status === "New" ? "default" : "secondary"} className={rfp.status === "New" ? "bg-accent text-accent-foreground" : ""}>
                      {rfp.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rfp.org}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{rfp.category}</Badge>
                    <Badge variant="outline">{rfp.location}</Badge>
                    <Badge variant="outline">{rfp.value}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-semibold text-foreground">{rfp.deadline}</p>
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
