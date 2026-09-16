import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExternalLink, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";

interface SavedAnalysis {
  id: string;
  title: string;
  created_at: string;
  analysis_data: any;
}

interface SavedChecklistRow {
  id: string;
  title: string;
  created_at: string;
  deadline: string | null;
  country: string | null;
  checklist_data: any;
  checked_items: any;
}

interface SavedReview {
  id: string;
  rfp_title: string | null;
  rfp_id: string | null;
  overall_score: number | null;
  grade: string | null;
  created_at: string;
}

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");

const BidHistory = () => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [checklists, setChecklists] = useState<SavedChecklistRow[]>([]);
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [linkedTitles, setLinkedTitles] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [a, c, r] = await Promise.all([
      supabase.from("bid_analyses").select("id, title, created_at, analysis_data")
        .eq("user_id", user.id).is("engagement_id", null).order("created_at", { ascending: false }),
      supabase.from("submission_checklists").select("id, title, created_at, deadline, country, checklist_data, checked_items")
        .eq("user_id", user.id).is("engagement_id", null).order("created_at", { ascending: false }),
      supabase.from("bid_reviews").select("id, rfp_title, rfp_id, overall_score, grade, created_at")
        .eq("user_id", user.id).is("engagement_id", null).order("created_at", { ascending: false }),
    ]);
    setAnalyses((a.data as SavedAnalysis[]) ?? []);
    setChecklists((c.data as SavedChecklistRow[]) ?? []);
    const reviewRows = (r.data as SavedReview[]) ?? [];
    setReviews(reviewRows);

    const ids = reviewRows.map((row) => row.rfp_id).filter(Boolean) as string[];
    if (ids.length > 0) {
      const { data: rfps } = await supabase.from("scraped_rfps").select("id, title").in("id", ids);
      setLinkedTitles(Object.fromEntries((rfps ?? []).map((row) => [row.id, row.title])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (table: "bid_analyses" | "submission_checklists" | "bid_reviews", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    load();
  };

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={true} onOpenChange={() => {}} feature="Bid Studio history" />
        <div className="container py-16 text-center"><p className="text-muted-foreground">This is a Pro feature.</p></div>
      </>
    );
  }

  return (
    <div className="container py-12 space-y-8 max-w-4xl">
      <SEO
        title="Bid Studio History | MiddlBrand"
        description="Revisit your saved RFP analyses, submission checklists and bid reviews."
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Bid Studio History</h1>
          <p className="text-muted-foreground mt-1">Everything you have analysed, planned and scored</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/bid-studio">Back to Bid Studio</Link></Button>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : (
        <Tabs defaultValue="analyses">
          <TabsList>
            <TabsTrigger value="analyses">Analyses ({analyses.length})</TabsTrigger>
            <TabsTrigger value="checklists">Checklists ({checklists.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="analyses" className="space-y-3 mt-4">
            {analyses.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved analyses yet. <Link to="/bid-studio/analyser" className="underline">Analyse an RFP</Link>.</p>
            )}
            {analyses.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate("/bid-studio/analyser", { state: { savedAnalysis: item.analysis_data } })}>
                      Open <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete analysis" onClick={() => remove("bid_analyses", item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="checklists" className="space-y-3 mt-4">
            {checklists.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved checklists yet. <Link to="/bid-studio/checklist" className="underline">Build a submission plan</Link>.</p>
            )}
            {checklists.map((item) => {
              const ticked = Object.values(item.checked_items ?? {}).filter(Boolean).length;
              return (
                <Card key={item.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}{ticked > 0 && ` · ${ticked} item${ticked === 1 ? "" : "s"} ticked off`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate("/bid-studio/checklist", { state: { savedChecklist: { id: item.id, checklist_data: item.checklist_data, checked_items: item.checked_items ?? {} } } })}>
                        Open <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete checklist" onClick={() => remove("submission_checklists", item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3 mt-4">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved reviews yet. <Link to="/bid-studio/reviewer" className="underline">Score a bid</Link>.</p>
            )}
            {reviews.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.rfp_id ? linkedTitles[item.rfp_id] ?? item.rfp_title : item.rfp_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                      {item.rfp_id ? " · linked to a live listing" : " · not linked to a listing"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.overall_score !== null && (
                      <Badge variant="outline">{item.overall_score}/100 {item.grade}</Badge>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Delete review" onClick={() => remove("bid_reviews", item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default BidHistory;
