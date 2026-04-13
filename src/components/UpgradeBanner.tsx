import { Link } from "react-router-dom";
import { Zap, ArrowRight, Clock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const UpgradeBanner = () => {
  const { isPro, end, loading } = useSubscription();

  if (loading) return null;

  // Pro user with active trial (has an end date)
  if (isPro && end) {
    const daysLeft = Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return (
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-3 flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent shrink-0" />
          <p className="text-sm text-foreground font-body">
            <span className="font-semibold">Pro Trial</span>
            <span className="text-muted-foreground ml-2">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "Trial expired"} — upgrade to keep Pro features
            </span>
          </p>
        </div>
        <Link to="/pricing" className="text-xs text-accent hover:text-accent/80 font-semibold flex items-center gap-1 shrink-0">
          Upgrade <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // Pro user without end date (paid subscriber) — no banner needed
  if (isPro) return null;

  // Free user
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-3 flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent shrink-0" />
        <p className="text-sm text-foreground font-body">
          <span className="font-semibold">Free Plan</span>
          <span className="text-muted-foreground ml-2">Upgrade to Pro to see your AI match score and get daily RFP alerts</span>
        </p>
      </div>
      <Link to="/pricing" className="text-xs text-accent hover:text-accent/80 font-semibold flex items-center gap-1 shrink-0">
        Upgrade <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
};

export default UpgradeBanner;
