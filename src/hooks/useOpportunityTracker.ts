import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TrackerStatus =
  | "interested"
  | "preparing"
  | "submitted"
  | "won"
  | "lost"
  | "no_decision_yet"
  | "not_pursued";

export const TERMINAL_STATUSES: TrackerStatus[] = ["won", "lost", "no_decision_yet", "not_pursued"];

export const STATUS_LABEL: Record<TrackerStatus, string> = {
  interested: "Interested",
  preparing: "Preparing",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  no_decision_yet: "No decision yet",
  not_pursued: "Didn't bid",
};

export interface TrackerRow {
  id: string;
  rfp_id: string;
  status: TrackerStatus;
  predicted_match_score: number | null;
  predicted_win_probability: number | null;
  predicted_review_score: number | null;
  predicted_review_grade: string | null;
  contract_value: number | null;
  contract_currency: string | null;
  outcome_reported_at: string | null;
  outcome_note: string | null;
  snooze_until: string | null;
  created_at: string;
  scraped_rfps?: { title: string; deadline: string | null; portal: string | null; category: string | null } | null;
}

const SELECT =
  "id, rfp_id, status, predicted_match_score, predicted_win_probability, predicted_review_score, predicted_review_grade, contract_value, contract_currency, outcome_reported_at, outcome_note, snooze_until, created_at, scraped_rfps(title, deadline, portal, category)";

/**
 * The company's opportunity pipeline. Stage changes before an outcome are plain
 * row writes; outcomes go through the record-outcome function so the success fee
 * is always computed server-side.
 */
export const useOpportunityTracker = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("opportunity_tracker")
      .select(SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as unknown as TrackerRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Migrates any browser-stored saved listings into the tracker, once. */
  useEffect(() => {
    if (!user || loading) return;
    const stored = localStorage.getItem("savedRfps");
    if (!stored) return;
    let ids: string[] = [];
    try {
      ids = JSON.parse(stored);
    } catch {
      localStorage.removeItem("savedRfps");
      return;
    }
    const existing = new Set(rows.map((r) => r.rfp_id));
    const missing = ids.filter((id) => id && !existing.has(id));
    if (missing.length === 0) {
      localStorage.removeItem("savedRfps");
      return;
    }
    supabase
      .from("opportunity_tracker")
      .upsert(
        missing.map((id) => ({ user_id: user.id, rfp_id: id, status: "interested" })),
        { onConflict: "user_id,rfp_id" },
      )
      .then(() => {
        localStorage.removeItem("savedRfps");
        load();
      });
  }, [user, loading, rows, load]);

  const byRfp = useCallback(
    (rfpId: string) => rows.find((r) => r.rfp_id === rfpId) ?? null,
    [rows],
  );

  /** Stage changes (interested / preparing / submitted). */
  const setStage = useCallback(
    async (rfpId: string, status: Extract<TrackerStatus, "interested" | "preparing" | "submitted">) => {
      if (!user) return { error: "Please sign in." };
      setSaving(rfpId);
      const { error } = await supabase
        .from("opportunity_tracker")
        .upsert({ user_id: user.id, rfp_id: rfpId, status }, { onConflict: "user_id,rfp_id" });
      setSaving(null);
      if (error) return { error: error.message };
      await load();
      return {};
    },
    [user, load],
  );

  const removeRow = useCallback(
    async (rfpId: string) => {
      if (!user) return;
      await supabase.from("opportunity_tracker").delete().eq("user_id", user.id).eq("rfp_id", rfpId);
      await load();
    },
    [user, load],
  );

  /** Outcomes (won / lost / no decision yet / didn't bid) — always server-side. */
  const reportOutcome = useCallback(
    async (
      rfpId: string,
      status: TrackerStatus,
      extra: { note?: string; contract_value?: number; currency?: string; agreement_confirmed?: boolean } = {},
    ) => {
      setSaving(rfpId);
      const { data, error } = await supabase.functions.invoke("record-outcome", {
        body: { action: "set_status", rfp_id: rfpId, status, ...extra },
      });
      setSaving(null);
      if (error || (data as any)?.error) {
        return { error: ((data as any)?.error as string) || "Could not save that. Please try again." };
      }
      await load();
      return { success_fee: (data as any)?.success_fee as number | null };
    },
    [load],
  );

  const snooze = useCallback(
    async (rfpId: string) => {
      setSaving(rfpId);
      await supabase.functions.invoke("record-outcome", { body: { action: "snooze", rfp_id: rfpId } });
      setSaving(null);
      await load();
    },
    [load],
  );

  const now = Date.now();
  const awaitingOutcome = rows.filter((r) => {
    if (TERMINAL_STATUSES.includes(r.status)) return false;
    const deadline = r.scraped_rfps?.deadline;
    if (!deadline) return false;
    if (new Date(deadline).getTime() > now) return false;
    if (r.snooze_until && new Date(r.snooze_until).getTime() > now) return false;
    return true;
  });

  return {
    rows,
    loading,
    saving,
    byRfp,
    setStage,
    reportOutcome,
    snooze,
    removeRow,
    awaitingOutcome,
    reload: load,
  };
};
