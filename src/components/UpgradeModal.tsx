import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown } from "lucide-react";
import { Link } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const UpgradeModal = ({ open, onOpenChange, feature }: UpgradeModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-5 w-5 text-accent" />
          <DialogTitle className="font-display text-xl">Upgrade to Pro</DialogTitle>
        </div>
        <DialogDescription className="text-sm text-muted-foreground">
          {feature
            ? `"${feature}" is a Pro feature.`
            : "This is a Pro feature."}{" "}
          Upgrade to unlock AI matching, daily alerts, and full RFP details.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Monthly */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-body uppercase tracking-widest text-muted-foreground">Monthly</p>
          <p className="text-3xl font-display font-bold text-foreground">$40<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground">Billed monthly</p>
          <Button asChild className="w-full rounded-full" size="sm">
            <Link to="/pricing" onClick={() => onOpenChange(false)}>Start Monthly</Link>
          </Button>
        </div>

        {/* Annual */}
        <div className="rounded-xl border-2 border-accent p-4 space-y-3 relative">
          <Badge className="absolute -top-2.5 right-3 bg-accent text-accent-foreground text-[10px]">Best Value</Badge>
          <p className="text-xs font-body uppercase tracking-widest text-muted-foreground">Annual</p>
          <p className="text-3xl font-display font-bold text-foreground">$32<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-accent font-semibold">Save $96 — 2 months free</p>
          <Button asChild className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
            <Link to="/pricing" onClick={() => onOpenChange(false)}>Start Annual</Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {[
          "AI match score on every RFP",
          "Daily email digest of matched opportunities",
          "Full RFP detail pages with AI summary",
          "\"I'm Bidding\" pipeline tracker",
          "Success fee partnership (3.5%, capped at $5,000)",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-accent shrink-0" />
            {f}
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default UpgradeModal;
