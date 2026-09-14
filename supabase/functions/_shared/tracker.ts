// Shared helpers for the outcome loop.
//
// Predictions are snapshotted at the moment they are shown to the user, on the
// opportunity_tracker row. Snapshots are written once and never overwritten, so
// accuracy stays measurable even when profiles (and therefore scores) change.

// deno-lint-ignore-file no-explicit-any
type SupabaseClient = any;

export type TrackerStatus =
  | "interested"
  | "preparing"
  | "submitted"
  | "won"
  | "lost"
  | "no_decision_yet"
  | "not_pursued";

const TERMINAL: TrackerStatus[] = ["won", "lost", "no_decision_yet", "not_pursued"];
const RANK: Record<TrackerStatus, number> = {
  interested: 1,
  preparing: 2,
  submitted: 3,
  won: 4,
  lost: 4,
  no_decision_yet: 4,
  not_pursued: 4,
};

export interface PredictionSnapshot {
  predicted_match_score?: number | null;
  predicted_match_at?: string | null;
  insight_id?: string | null;
  predicted_win_probability?: number | null;
  predicted_win_confidence?: string | null;
  predicted_review_score?: number | null;
  predicted_review_grade?: string | null;
  review_id?: string | null;
}

/**
 * Ensures a tracker row exists for (user, opportunity), records any prediction
 * fields that are not yet set, and advances the stage only forwards. Never
 * downgrades a stage and never touches a reported outcome.
 */
export async function snapshotPrediction(
  admin: SupabaseClient,
  userId: string,
  rfpId: string,
  snapshot: PredictionSnapshot,
  minStatus: TrackerStatus = "interested",
): Promise<void> {
  try {
    const { data: existing } = await admin
      .from("opportunity_tracker")
      .select("id, status, predicted_match_score, predicted_win_probability, predicted_review_score")
      .eq("user_id", userId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!existing) {
      const { error } = await admin.from("opportunity_tracker").insert({
        user_id: userId,
        rfp_id: rfpId,
        status: minStatus,
        prediction_snapshot_at: now,
        ...stripUndefined(snapshot),
        predicted_match_at: snapshot.predicted_match_score != null ? now : null,
      });
      if (error) console.error("tracker: insert failed", error);
      return;
    }

    const patch: Record<string, unknown> = {};
    if (snapshot.predicted_match_score != null && existing.predicted_match_score == null) {
      patch.predicted_match_score = snapshot.predicted_match_score;
      patch.predicted_match_at = now;
      if (snapshot.insight_id) patch.insight_id = snapshot.insight_id;
    }
    if (snapshot.predicted_win_probability != null && existing.predicted_win_probability == null) {
      patch.predicted_win_probability = snapshot.predicted_win_probability;
      if (snapshot.predicted_win_confidence) patch.predicted_win_confidence = snapshot.predicted_win_confidence;
    }
    if (snapshot.predicted_review_score != null && existing.predicted_review_score == null) {
      patch.predicted_review_score = snapshot.predicted_review_score;
      if (snapshot.predicted_review_grade) patch.predicted_review_grade = snapshot.predicted_review_grade;
      if (snapshot.review_id) patch.review_id = snapshot.review_id;
    }

    const current = existing.status as TrackerStatus;
    if (!TERMINAL.includes(current) && RANK[minStatus] > RANK[current]) {
      patch.status = minStatus;
    }

    if (Object.keys(patch).length === 0) return;
    patch.prediction_snapshot_at = existing.prediction_snapshot_at ?? now;

    const { error } = await admin
      .from("opportunity_tracker")
      .update(patch)
      .eq("id", existing.id);
    if (error) console.error("tracker: update failed", error);
  } catch (e) {
    // Snapshotting must never break the AI feature that triggered it.
    console.error("tracker: snapshot error", e);
  }
}

const stripUndefined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** 3.5% of the contract value, capped at USD 5,000. Two decimal places. */
export const successFeeFor = (contractValue: number): number =>
  Math.min(Math.round(contractValue * 0.035 * 100) / 100, 5000);
