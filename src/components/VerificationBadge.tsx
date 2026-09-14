import { BadgeCheck, Clock, ShieldAlert, ShieldX, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/hooks/useVerification";

const CONFIG: Record<VerificationStatus, { label: string; icon: typeof BadgeCheck; className: string }> = {
  verified: { label: "Verified", icon: BadgeCheck, className: "border-accent/40 bg-accent/10 text-accent" },
  pending: { label: "Verification pending", icon: Clock, className: "border-border bg-muted text-muted-foreground" },
  rejected: { label: "Verification rejected", icon: ShieldX, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  expired: { label: "Verification expired", icon: ShieldAlert, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  unverified: { label: "Not verified", icon: ShieldQuestion, className: "border-border bg-muted text-muted-foreground" },
};

interface Props {
  status: VerificationStatus;
  className?: string;
  showUnverified?: boolean;
}

const VerificationBadge = ({ status, className, showUnverified = true }: Props) => {
  if (status === "unverified" && !showUnverified) return null;
  const { label, icon: Icon, className: tone } = CONFIG[status] ?? CONFIG.unverified;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
};

export default VerificationBadge;
