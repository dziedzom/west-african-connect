import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, DollarSign, Building, Brain, TrendingUp, AlertTriangle, Trophy, Lock, ThumbsUp, ThumbsDown, HelpCircle, ListChecks, ShieldAlert, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import WonContractModal from "@/components/WonContractModal";
import type { RFP } from "@/types/rfp";

interface AIInsight {
  match_score: number;
  winning_strategy_summary: string | null;
  gap_analysis: string | null;
  key_requirements: string[] | null;
  risk_flags: string[] | null;
  missing_qualifications: string[] | null;
}

interface RFPDetailModalProps {
  rfp: RFP | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScoreGauge = ({ score }: { score: number }) => {
  const percentage = Math.min(Math.max(score, 0), 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 75 ? "hsl(var(--accent))" :
    percentage >= 50 ? "hsl(45 93% 47%)" :
    "hsl(0 72% 51%)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="48" cy="48" r="40" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute mt-7 text-2xl font-display font-bold text-foreground">{percentage}%</span>
      <span className="text-xs text-muted-foreground font-body">Match Score</span>
    </div>
  );
};

const GoNoGoBadge = ({ score }: { score: number }) => {
  const config = score >= 75
    ? { label: "Go", icon: ThumbsUp, bg: "bg-green-500/15", text: "text-green-600", border: "border-green-500/30" }
    : score >= 50
    ? { label: "Maybe", icon: HelpCircle, bg: "bg-yellow-500/15", text: "text-yellow-600", border: "border-yellow-500/30" }
    : { label: "No-Go", icon: ThumbsDown, bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" };

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  );
};

const AIInsightsPanel = ({ rfpId }: { rfpId: string }) => {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchOrGenerate = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("ai_insights")
        .select("match_score, winning_strategy_summary, gap_analysis, key_requirements, risk_flags, missing_qualifications")
        .eq("rfp_id", rfpId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setInsight(data as AIInsight);
        setLoading(false);
        return;
      }

      setLoading(false);
      setGenerating(true);
      try {
        const { data: result, error } = await supabase.functions.invoke("generate-ai-insights", {
          body: { rfp_id: rfpId },
        });
        if (error) throw error;
        if (result?.status === "created") {
          setInsight({
            match_score: result.match_score,
            winning_strategy_summary: result.winning_strategy_summary,
            gap_analysis: result.gap_analysis,
            key_requirements: result.key_requirements ?? [],
            risk_flags: result.risk_flags ?? [],
            missing_qualifications: result.missing_qualifications ?? [],
          });
        }
      } catch (e) {
        console.error("Failed to generate AI insights:", e);
      } finally {
        setGenerating(false);
      }
    };
    fetchOrGenerate();
  }, [rfpId]);

  if (loading || generating) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent animate-pulse" />
          <span className="text-sm font-display font-semibold text-foreground">
            {generating ? "Generating AI Insights…" : "Loading…"}
          </span>
        </div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
        <Brain className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">No AI insights available yet for this RFP.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent" />
        <span className="text-sm font-display font-semibold text-foreground">AI Insights</span>
      </div>
      <div className="flex items-center justify-center gap-4 relative">
        <ScoreGauge score={insight.match_score} />
        <GoNoGoBadge score={insight.match_score} />
      </div>
      {insight.winning_strategy_summary && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            Winning Strategy
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.winning_strategy_summary}</p>
        </div>
      )}
      {insight.gap_analysis && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
            Gap Analysis
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.gap_analysis}</p>
        </div>
      )}
      {insight.key_requirements && insight.key_requirements.length > 0 && (
        <div className="space-y-1.5 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ListChecks className="h-3.5 w-3.5 text-accent" />
            Key Requirements
          </div>
          <ul className="space-y-1">
            {insight.key_requirements.map((req, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-accent mt-0.5">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {insight.risk_flags && insight.risk_flags.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
            Risk Flags
          </div>
          <ul className="space-y-1">
            {insight.risk_flags.map((risk, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-red-500 mt-0.5">⚠</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {insight.missing_qualifications && insight.missing_qualifications.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <XCircle className="h-3.5 w-3.5 text-yellow-500" />
            Missing Qualifications
          </div>
          <ul className="space-y-1">
            {insight.missing_qualifications.map((mq, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-yellow-500 mt-0.5">○</span>
                <span>{mq}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const LockedInsightsPanel = ({ onUpgrade }: { onUpgrade: () => void }) => (
  <div
    className="rounded-lg border border-border bg-muted/20 p-6 text-center cursor-pointer hover:border-accent/30 transition-colors"
    onClick={onUpgrade}
  >
    <Lock className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
    <p className="text-sm font-display font-semibold text-foreground mb-1">AI Insights — Pro Only</p>
    <p className="text-xs text-muted-foreground">Upgrade to Pro to see your AI match score, winning strategy, and gap analysis.</p>
  </div>
);

const RFPDetailModal = ({ rfp, open, onOpenChange }: RFPDetailModalProps) => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [wonOpen, setWonOpen] = useState(false);

  if (!rfp) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{rfp.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4 text-accent" />
              <span>{rfp.org}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{rfp.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-accent" />
                <span>{rfp.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-accent" />
                <span>{rfp.value}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-accent" />
                <span>Due: {rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{rfp.category}</Badge>
              {rfp.location && <Badge variant="outline" className="border-accent/30 text-accent">{rfp.location}</Badge>}
            </div>

            {/* AI Insights — gated behind Pro */}
            {user && isPro ? (
              <AIInsightsPanel rfpId={rfp.id} />
            ) : (
              <LockedInsightsPanel onUpgrade={() => setUpgradeOpen(true)} />
            )}

            <div className="flex gap-2 mt-2">
              {isPro && (
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  onClick={() => setWonOpen(true)}
                >
                  <Trophy className="h-4 w-4 mr-1" /> I Won This Contract
                </Button>
              )}
              <Button
                className={`${isPro ? "flex-1" : "w-full"} bg-accent text-accent-foreground hover:bg-accent/90 font-semibold`}
                onClick={() => {
                  if (!isPro) {
                    setUpgradeOpen(true);
                  }
                }}
              >
                {isPro ? "I'm Bidding" : "Express Interest"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="AI Insights" />
      {rfp && <WonContractModal open={wonOpen} onOpenChange={setWonOpen} rfpId={rfp.id} rfpTitle={rfp.title} />}
    </>
  );
};

export default RFPDetailModal;
