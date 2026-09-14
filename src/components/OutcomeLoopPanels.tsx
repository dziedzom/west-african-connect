import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Target, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OutcomeControl from "@/components/OutcomeControl";
import { STATUS_LABEL, TERMINAL_STATUSES, useOpportunityTracker } from "@/hooks/useOpportunityTracker";

interface SuccessFee {
  id: string;
  rfp_title: string;
  contract_value: number;
  currency: string;
  success_fee: number;
  invoice_sent: boolean;
  fee_paid: boolean;
  created_at: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * The dashboard end of the outcome loop: outcomes still to confirm, the full
 * pipeline with the predictions that were shown at the time, and the success
 * fees on record.
 */
const OutcomeLoopPanels = () => {
  const { user } = useAuth();
  const { rows, loading, saving, setStage, reportOutcome, snooze, awaitingOutcome, reload } = useOpportunityTracker();
  const [fees, setFees] = useState<SuccessFee[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("won_contracts")
      .select("id, rfp_title, contract_value, currency, success_fee, invoice_sent, fee_paid, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setFees((data as SuccessFee[]) ?? []));
  }, [user, rows]);

  if (!user) return null;

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-xl mb-8" />;
  }

  const totalFees = fees.reduce((s, f) => s + Number(f.success_fee || 0), 0);
  const outstanding = fees.filter((f) => !f.fee_paid).reduce((s, f) => s + Number(f.success_fee || 0), 0);

  return (
    <>
      {/* Outcomes to confirm */}
      {awaitingOutcome.length > 0 && (
        <div id="outcomes" className="rounded-xl border border-accent/30 bg-accent/5 p-6 mb-8 scroll-mt-24">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-display font-bold text-foreground">Outcomes to confirm</h2>
            <Badge variant="default" className="text-[10px]">{awaitingOutcome.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            The deadline has passed on these. One tap tells us how it went — and keeps your match scores honest.
          </p>
          <ul className="space-y-3">
            {awaitingOutcome.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-display font-semibold text-foreground">{r.scraped_rfps?.title ?? "Opportunity"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Closed {fmtDate(r.scraped_rfps?.deadline ?? null)}
                      {r.predicted_match_score != null && ` · we predicted a ${r.predicted_match_score}% match`}
                      {r.predicted_win_probability != null && ` · ${r.predicted_win_probability}% win chance`}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => snooze(r.rfp_id)}
                    disabled={saving === r.rfp_id}
                  >
                    Ask me later
                  </button>
                </div>
                <div className="mt-2">
                  <OutcomeControl
                    rfpId={r.rfp_id}
                    rfpTitle={r.scraped_rfps?.title ?? "Opportunity"}
                    deadline={r.scraped_rfps?.deadline ?? null}
                    row={r}
                    busy={saving === r.rfp_id}
                    onStage={setStage}
                    onOutcome={reportOutcome}
                    onChanged={reload}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pipeline */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-display font-bold text-foreground">Your pipeline</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Closes</TableHead>
                  <TableHead>Predicted</TableHead>
                  <TableHead>Stage / result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[260px]">
                      <p className="text-xs font-semibold text-foreground truncate">{r.scraped_rfps?.title ?? "Opportunity"}</p>
                      {r.scraped_rfps?.portal && (
                        <span className="text-[10px] text-muted-foreground">{r.scraped_rfps.portal}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(r.scraped_rfps?.deadline ?? null)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.predicted_match_score != null ? `${r.predicted_match_score}% match` : "—"}
                      {r.predicted_win_probability != null && (
                        <span className="block text-[10px] text-muted-foreground">{r.predicted_win_probability}% win chance</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {TERMINAL_STATUSES.includes(r.status) ? (
                        <Badge variant={r.status === "won" ? "default" : "secondary"} className="text-[10px]">
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      ) : (
                        <OutcomeControl
                          rfpId={r.rfp_id}
                          rfpTitle={r.scraped_rfps?.title ?? "Opportunity"}
                          deadline={r.scraped_rfps?.deadline ?? null}
                          row={r}
                          busy={saving === r.rfp_id}
                          onStage={setStage}
                          onOutcome={reportOutcome}
                          onChanged={reload}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Success fees */}
      {fees.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-8">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-display font-bold text-foreground">Success fees</h2>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Total ${totalFees.toLocaleString()} · outstanding{" "}
              <span className="font-semibold text-foreground">${outstanding.toLocaleString()}</span>
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Fee (USD)</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-[240px] text-xs truncate font-medium">{f.rfp_title}</TableCell>
                  <TableCell className="text-xs">{f.currency} {Number(f.contract_value).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-semibold">${Number(f.success_fee).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={f.invoice_sent ? "default" : "secondary"} className="text-[10px]">
                      {f.invoice_sent ? "Sent" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.fee_paid ? "default" : "outline"} className="text-[10px]">
                      {f.fee_paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[10px] text-muted-foreground mt-3">
            3.5% of the contract value, capped at USD $5,000. We invoice after you confirm the win.
          </p>
        </div>
      )}
    </>
  );
};

export default OutcomeLoopPanels;
