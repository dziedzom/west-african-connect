import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import { SAMPLE_RFP_TEXT, SAMPLE_BID_DRAFT } from "@/lib/sampleRfp";
import { usePersistentState } from "@/hooks/usePersistentState";
import SaveStatusIndicator from "@/components/SaveStatusIndicator";
import ScoreDashboard, { CategoryScores, ScoreHistoryEntry } from "@/components/ScoreDashboard";

interface ReviewResult {
  overall_score: number;
  grade: string;
  verdict: string;
  category_scores?: CategoryScores;
  strengths: string[];
  weaknesses: string[];
  missing_elements: string[];
  compliance_check: { requirement: string; addressed: boolean; comment: string }[];
  specific_improvements: { section: string; issue: string; suggestion: string }[];
  competitive_assessment: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600 border-green-500 bg-green-50 dark:bg-green-950/30";
  if (score >= 60) return "text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/30";
  if (score >= 40) return "text-orange-600 border-orange-500 bg-orange-50 dark:bg-orange-950/30";
  return "text-red-600 border-red-500 bg-red-50 dark:bg-red-950/30";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Strong Bid";
  if (score >= 60) return "Needs Work";
  if (score >= 40) return "Significant Revision Required";
  return "Major Rewrite Needed";
};

const BidReviewer = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [rfpText, setRfpText] = usePersistentState<string>("bid-reviewer:rfpText", (location.state as any)?.rfpText || "");
  const [bidDraft, setBidDraft] = usePersistentState<string>("bid-reviewer:bidDraft", (location.state as any)?.bidDraft || "");
  const [scoreHistory, setScoreHistory, resetHistory] = usePersistentState<ScoreHistoryEntry[]>("bid-reviewer:scoreHistory", []);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");

  const handleRescore = () => {
    setResult(null);
    setError("");
    // Scroll to top so user can edit inputs
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={true} onOpenChange={() => {}} feature="Bid Reviewer" />
        <div className="container py-16 text-center"><p className="text-muted-foreground">This is a Pro feature.</p></div>
      </>
    );
  }

  const handleReview = async () => {
    if (!rfpText.trim() || !bidDraft.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    // TODO: Switch to Claude claude-opus-4-5 when ANTHROPIC_API_KEY is added
    const { data, error: fnError } = await supabase.functions.invoke("bid-studio-ai", {
      body: { tool: "reviewer", variables: { rfp_text: rfpText, bid_draft: bidDraft } },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError(data?.error || "Our AI assistant is busy right now — please try again in a moment.");
    } else {
      setResult(data.result);
      // Append to score history (keep last 20)
      setScoreHistory([
        ...scoreHistory,
        { timestamp: Date.now(), overall_score: data.result.overall_score, grade: data.result.grade },
      ].slice(-20));
      // Save review
      if (user) {
        await supabase.from("bid_reviews").insert({
          user_id: user.id,
          rfp_title: rfpText.substring(0, 100),
          overall_score: data.result.overall_score,
          grade: data.result.grade,
          review_data: data.result,
        });
      }
    }
  };

  return (
    <div className="container py-12 space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">📋 Bid Reviewer</h1>
          <p className="text-muted-foreground mt-1">Score your bid before you submit</p>
        </div>
        <SaveStatusIndicator />
      </div>

      {!result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setRfpText(SAMPLE_RFP_TEXT); setBidDraft(SAMPLE_BID_DRAFT); setError(""); }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Load sample RFP + draft
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Paste original RFP requirements</label>
              <Textarea className="min-h-[150px]" placeholder="Paste the RFP requirements here..." value={rfpText} onChange={(e) => setRfpText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Paste your complete bid draft</label>
              <Textarea className="min-h-[200px]" placeholder="Paste your bid draft here..." value={bidDraft} onChange={(e) => setBidDraft(e.target.value)} />
            </div>
            <Button onClick={handleReview} disabled={!rfpText.trim() || !bidDraft.trim() || loading} className="w-full">
              {loading ? "Evaluating your bid against RFP requirements..." : "Review My Bid"}
            </Button>
            {loading && <div className="space-y-3"><Skeleton className="h-4 w-full animate-pulse" /><Skeleton className="h-4 w-3/4 animate-pulse" /></div>}
            {error && <div className="text-center space-y-2"><p className="text-destructive text-sm">{error}</p><Button variant="outline" size="sm" onClick={handleReview}>Try Again</Button></div>}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Visual Score Dashboard */}
          <ScoreDashboard
            overallScore={result.overall_score}
            grade={result.grade}
            verdict={result.verdict}
            categoryScores={result.category_scores}
            history={scoreHistory}
          />

          {/* Re-score CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Made improvements to your bid?</p>
              <p className="text-xs text-muted-foreground">Edit your draft above and re-score to track progress.</p>
            </div>
            <Button onClick={handleRescore} size="sm">
              <RefreshCw className="h-4 w-4 mr-1.5" /> Re-score Bid
            </Button>
          </div>

          {/* Strengths / Weaknesses / Missing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-500/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">Strengths</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{result.strengths?.map((s, i) => <li key={i} className="flex gap-1"><CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{s}</li>)}</ul></CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-600">Weaknesses</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{result.weaknesses?.map((w, i) => <li key={i}>• {w}</li>)}</ul></CardContent>
            </Card>
            <Card className="border-red-500/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Missing Elements</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{result.missing_elements?.map((m, i) => <li key={i} className="flex gap-1"><XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />{m}</li>)}</ul></CardContent>
            </Card>
          </div>

          {/* Compliance Check */}
          <Card>
            <CardHeader><CardTitle className="text-base">Compliance Check</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="text-left p-2">Requirement</th><th className="text-left p-2 w-20">Status</th><th className="text-left p-2">Comment</th></tr></thead>
                  <tbody>
                    {result.compliance_check?.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{c.requirement}</td>
                        <td className="p-2">{c.addressed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</td>
                        <td className="p-2 text-muted-foreground">{c.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Specific Improvements */}
          <Card>
            <CardHeader><CardTitle className="text-base">Specific Improvements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.specific_improvements?.map((imp, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/30 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{imp.section}</Badge>
                    <span className="text-sm font-medium">{imp.issue}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{imp.suggestion}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Competitive Assessment */}
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader><CardTitle className="text-base">Competitive Assessment</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{result.competitive_assessment}</p></CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleRescore}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Re-score Bid
            </Button>
            {scoreHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => resetHistory()}>
                Clear score history
              </Button>
            )}
            <Button asChild variant="outline" className="ml-auto">
              <Link to="/bid-studio/writer"><ArrowLeft className="h-4 w-4 mr-1" /> Go Back to Bid Writer</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidReviewer;
