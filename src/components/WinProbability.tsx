import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Sparkles } from "lucide-react";

export interface BoostTip {
  action: string;
  estimated_lift: string;
}

export interface WinProbabilityData {
  percentage: number;
  confidence?: "low" | "medium" | "high" | string;
  rationale?: string;
  benchmark?: string;
  boost_tips?: BoostTip[];
}

const probabilityTone = (pct: number) => {
  if (pct >= 65) return { text: "text-green-600", ring: "stroke-green-500", bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-500/40", label: "High likelihood" };
  if (pct >= 35) return { text: "text-amber-600", ring: "stroke-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-500/40", label: "Moderate chance" };
  return { text: "text-red-600", ring: "stroke-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-500/40", label: "Long shot" };
};

interface Props {
  data: WinProbabilityData;
}

const WinProbability = ({ data }: Props) => {
  const pct = Math.max(0, Math.min(100, Math.round(data.percentage ?? 0)));
  const tone = probabilityTone(pct);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className={`${tone.border} ${tone.bg}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${tone.text}`} />
          Win Probability
        </CardTitle>
        {data.confidence && (
          <Badge variant="outline" className="text-xs capitalize">
            {data.confidence} confidence
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="relative w-36 h-36 mx-auto md:mx-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} strokeWidth="10" className="stroke-muted fill-none" />
              <circle
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={`fill-none transition-all duration-700 ease-out ${tone.ring}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${tone.text}`}>{pct}%</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Estimated</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated Win Probability</p>
              <p className={`text-sm font-semibold ${tone.text}`}>{tone.label}</p>
            </div>
            {data.benchmark && (
              <p className="text-sm text-foreground/80 italic">"{data.benchmark}"</p>
            )}
            {data.rationale && (
              <p className="text-sm text-muted-foreground">{data.rationale}</p>
            )}
          </div>
        </div>

        {data.boost_tips && data.boost_tips.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              How to boost your odds
            </h4>
            <ul className="space-y-2">
              {data.boost_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 p-2.5 rounded-md bg-background/60 border border-border/50">
                  <TrendingUp className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{tip.action}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold text-green-700 dark:text-green-400 shrink-0">
                    {tip.estimated_lift}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WinProbability;
