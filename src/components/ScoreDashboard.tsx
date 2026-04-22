import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface CategoryScore {
  score: number;
  recommendation: string;
}

export interface CategoryScores {
  compliance: CategoryScore;
  technical_strength: CategoryScore;
  pricing_value: CategoryScore;
  language_clarity: CategoryScore;
  completeness: CategoryScore;
}

export interface ScoreHistoryEntry {
  timestamp: number;
  overall_score: number;
  grade: string;
}

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  compliance: "Compliance",
  technical_strength: "Technical Strength",
  pricing_value: "Pricing & Value",
  language_clarity: "Language & Clarity",
  completeness: "Completeness",
};

const scoreTone = (score: number) => {
  if (score >= 75) return { ring: "stroke-green-500", text: "text-green-600", bar: "bg-green-500", dot: "bg-green-500", label: "Strong" };
  if (score >= 50) return { ring: "stroke-amber-500", text: "text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500", label: "Needs Work" };
  return { ring: "stroke-red-500", text: "text-red-600", bar: "bg-red-500", dot: "bg-red-500", label: "Critical" };
};

interface ScoreRingProps {
  score: number;
  grade?: string;
}

const ScoreRing = ({ score, grade }: ScoreRingProps) => {
  const tone = scoreTone(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          strokeWidth="10"
          className="stroke-muted fill-none"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none transition-all duration-700 ease-out ${tone.ring}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${tone.text}`}>{score}</span>
        <span className="text-xs text-muted-foreground">out of 100</span>
        {grade && <span className={`mt-1 text-sm font-semibold ${tone.text}`}>Grade {grade}</span>}
      </div>
    </div>
  );
};

interface CategoryBarProps {
  label: string;
  score: number;
  recommendation: string;
}

const CategoryBar = ({ label, score, recommendation }: CategoryBarProps) => {
  const tone = scoreTone(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${tone.text}`}>{score}/100</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-700 ease-out ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground pl-4">{recommendation}</p>
    </div>
  );
};

interface ScoreDashboardProps {
  overallScore: number;
  grade: string;
  verdict: string;
  categoryScores?: CategoryScores;
  history: ScoreHistoryEntry[];
}

const ScoreDashboard = ({ overallScore, grade, verdict, categoryScores, history }: ScoreDashboardProps) => {
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const delta = previous ? overallScore - previous.overall_score : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bid Score Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={overallScore} grade={grade} />
            {previous && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  {delta > 0 ? "+" : ""}{delta} vs last
                </span>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground max-w-[180px] mt-1">{verdict}</p>
          </div>

          <div className="space-y-4">
            {categoryScores ? (
              (Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).map((key) => {
                const cat = categoryScores[key];
                if (!cat) return null;
                return (
                  <CategoryBar
                    key={key}
                    label={CATEGORY_LABELS[key]}
                    score={cat.score}
                    recommendation={cat.recommendation}
                  />
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Category breakdown unavailable for this review.</p>
            )}
          </div>
        </div>

        {history.length > 1 && (
          <div className="mt-8 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3">Score history</h4>
            <div className="flex items-end gap-2 h-20">
              {history.slice(-10).map((entry, i) => {
                const tone = scoreTone(entry.overall_score);
                const isLast = i === history.slice(-10).length - 1;
                return (
                  <div key={entry.timestamp} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="text-[10px] text-muted-foreground tabular-nums">{entry.overall_score}</div>
                    <div
                      className={`w-full rounded-t transition-all ${tone.bar} ${isLast ? "ring-2 ring-offset-1 ring-primary" : "opacity-70 group-hover:opacity-100"}`}
                      style={{ height: `${Math.max(entry.overall_score * 0.6, 4)}%` }}
                      title={new Date(entry.timestamp).toLocaleString()}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last {Math.min(history.length, 10)} reviews — most recent on the right.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreDashboard;
