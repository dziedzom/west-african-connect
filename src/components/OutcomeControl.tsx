import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trophy, XCircle, Clock, MinusCircle, Heart, FileEdit, Send } from "lucide-react";
import WonContractModal from "@/components/WonContractModal";
import { STATUS_LABEL, TERMINAL_STATUSES, type TrackerRow, type TrackerStatus } from "@/hooks/useOpportunityTracker";

interface OutcomeControlProps {
  rfpId: string;
  rfpTitle: string;
  deadline: string | null;
  row: TrackerRow | null;
  busy?: boolean;
  onStage: (rfpId: string, status: "interested" | "preparing" | "submitted") => Promise<{ error?: string }>;
  onOutcome: (
    rfpId: string,
    status: TrackerStatus,
    extra?: { note?: string },
  ) => Promise<{ error?: string } | { success_fee?: number | null }>;
  onChanged?: () => void;
}

const STAGES = [
  { key: "interested", label: "Interested", icon: Heart },
  { key: "preparing", label: "Preparing", icon: FileEdit },
  { key: "submitted", label: "Submitted", icon: Send },
] as const;

const OutcomeControl = ({
  rfpId,
  rfpTitle,
  deadline,
  row,
  busy,
  onStage,
  onOutcome,
  onChanged,
}: OutcomeControlProps) => {
  const { toast } = useToast();
  const [wonOpen, setWonOpen] = useState(false);
  const [lostNoteOpen, setLostNoteOpen] = useState(false);
  const [lostNote, setLostNote] = useState("");

  const status = row?.status ?? null;
  const deadlinePassed = !!deadline && new Date(deadline).getTime() < Date.now();
  const reported = !!status && TERMINAL_STATUSES.includes(status);

  const stage = async (next: "interested" | "preparing" | "submitted") => {
    const res = await onStage(rfpId, next);
    if (res.error) toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
    else onChanged?.();
  };

  const outcome = async (next: TrackerStatus, note?: string) => {
    const res = await onOutcome(rfpId, next, note ? { note } : undefined);
    if ((res as { error?: string }).error) {
      toast({ title: "Couldn't save", description: (res as { error?: string }).error, variant: "destructive" });
      return;
    }
    toast({ title: `Recorded as ${STATUS_LABEL[next].toLowerCase()}`, description: "Thank you — this keeps our match scores honest." });
    onChanged?.();
  };

  if (reported) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={status === "won" ? "default" : "secondary"} className="text-[10px]">
          {status === "won" && <Trophy className="h-3 w-3 mr-1" />}
          {STATUS_LABEL[status as TrackerStatus]}
        </Badge>
        {status === "won" && row?.contract_value && (
          <span className="text-[10px] text-muted-foreground">
            {row.contract_currency} {Number(row.contract_value).toLocaleString()}
          </span>
        )}
        {status !== "won" && (
          <button
            type="button"
            className="text-[10px] text-accent hover:underline"
            onClick={() => outcome("interested" as TrackerStatus)}
            disabled={busy}
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="sm"
              variant={status === s.key ? "default" : "outline"}
              className="rounded-full h-7 px-3 text-[11px]"
              disabled={busy}
              onClick={() => stage(s.key)}
            >
              <s.icon className="h-3 w-3 mr-1" /> {s.label}
            </Button>
          ))}
        </div>

        {(deadlinePassed || status === "submitted") && (
          <div className="rounded-lg border border-accent/25 bg-accent/5 p-2.5 space-y-2">
            <p className="text-[11px] text-foreground font-semibold">
              {deadlinePassed ? "This deadline has passed — how did it go?" : "Let us know the result when you hear back."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="rounded-full h-7 px-3 text-[11px]" disabled={busy} onClick={() => setWonOpen(true)}>
                <Trophy className="h-3 w-3 mr-1" /> We won
              </Button>
              <Button size="sm" variant="outline" className="rounded-full h-7 px-3 text-[11px]" disabled={busy} onClick={() => setLostNoteOpen((v) => !v)}>
                <XCircle className="h-3 w-3 mr-1" /> We lost
              </Button>
              <Button size="sm" variant="outline" className="rounded-full h-7 px-3 text-[11px]" disabled={busy} onClick={() => outcome("no_decision_yet")}>
                <Clock className="h-3 w-3 mr-1" /> No decision yet
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full h-7 px-3 text-[11px]" disabled={busy} onClick={() => outcome("not_pursued")}>
                <MinusCircle className="h-3 w-3 mr-1" /> Didn't bid
              </Button>
            </div>
            {lostNoteOpen && (
              <div className="space-y-1.5">
                <Textarea
                  value={lostNote}
                  onChange={(e) => setLostNote(e.target.value)}
                  placeholder="Optional: who won, or why you think you lost"
                  className="text-xs min-h-[60px]"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="rounded-full h-7 px-3 text-[11px]" disabled={busy} onClick={() => outcome("lost", lostNote.trim() || undefined)}>
                    Save as lost
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full h-7 px-3 text-[11px]" onClick={() => { setLostNoteOpen(false); setLostNote(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <WonContractModal
        open={wonOpen}
        onOpenChange={setWonOpen}
        rfpId={rfpId}
        rfpTitle={rfpTitle}
        onRecorded={onChanged}
      />
    </>
  );
};

export default OutcomeControl;
