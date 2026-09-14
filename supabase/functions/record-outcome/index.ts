// Records where a company stands on an opportunity, and the outcome once the
// deadline has passed. Runs with the service role so the success fee is always
// computed here (and by a database trigger), never accepted from the client.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { corsHeadersFor, createAdminClient } from "../_shared/entitlements.ts";
import { successFeeFor, type TrackerStatus } from "../_shared/tracker.ts";

const cors = corsHeadersFor();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const STATUSES: TrackerStatus[] = [
  "interested",
  "preparing",
  "submitted",
  "won",
  "lost",
  "no_decision_yet",
  "not_pursued",
];

const CURRENCIES = ["USD", "NGN", "KES", "GHS", "ZAR", "ETB", "TZS", "UGX", "RWF", "XOF", "MAD", "EGP", "EUR", "GBP"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in." }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user }, error: authError } = await anon.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "set_status";
    const admin = createAdminClient();

    if (action === "snooze") {
      const rfpId = String(body?.rfp_id ?? "");
      if (!rfpId) return json({ error: "rfp_id is required" }, 400);
      const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await admin
        .from("opportunity_tracker")
        .update({ status: "no_decision_yet", snooze_until: until, outcome_source: "user" })
        .eq("user_id", user.id)
        .eq("rfp_id", rfpId);
      if (error) return json({ error: error.message }, 400);
      return json({ status: "no_decision_yet", snooze_until: until });
    }

    if (action !== "set_status") return json({ error: "Unknown action" }, 400);

    const rfpId = String(body?.rfp_id ?? "");
    const status = String(body?.status ?? "") as TrackerStatus;
    if (!rfpId) return json({ error: "rfp_id is required" }, 400);
    if (!STATUSES.includes(status)) return json({ error: "Unknown status" }, 400);

    const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;
    const currency = CURRENCIES.includes(String(body?.currency)) ? String(body.currency) : "USD";
    const contractValue = Number(body?.contract_value);

    if (status === "won" && (!Number.isFinite(contractValue) || contractValue <= 0)) {
      return json({ error: "A contract value is required to record a win." }, 400);
    }

    const { data: rfp } = await admin
      .from("scraped_rfps")
      .select("id, title")
      .eq("id", rfpId)
      .maybeSingle();
    if (!rfp) return json({ error: "Opportunity not found." }, 404);

    const patch: Record<string, unknown> = {
      user_id: user.id,
      rfp_id: rfpId,
      status,
      outcome_note: note,
      outcome_source: ["won", "lost", "no_decision_yet", "not_pursued"].includes(status) ? "user" : null,
      snooze_until: null,
    };
    if (status === "won") {
      patch.contract_value = contractValue;
      patch.contract_currency = currency;
    }

    const { data: tracker, error: upsertError } = await admin
      .from("opportunity_tracker")
      .upsert(patch, { onConflict: "user_id,rfp_id" })
      .select("*")
      .maybeSingle();

    if (upsertError) {
      console.error("record-outcome: upsert failed", upsertError);
      return json({ error: "Could not save your update. Please try again." }, 400);
    }

    let successFee: number | null = null;
    let wonContractId: string | null = null;

    if (status === "won") {
      const { data: existingContract } = await admin
        .from("won_contracts")
        .select("id")
        .eq("user_id", user.id)
        .eq("rfp_id", rfpId)
        .maybeSingle();

      successFee = successFeeFor(contractValue);
      const record = {
        user_id: user.id,
        rfp_id: rfpId,
        tracker_id: tracker?.id ?? null,
        rfp_title: rfp.title,
        contract_value: contractValue,
        currency,
        agreement_confirmed: body?.agreement_confirmed === true,
        notes: note,
      };

      if (existingContract) {
        const { error } = await admin.from("won_contracts").update(record).eq("id", existingContract.id);
        if (error) console.error("record-outcome: contract update failed", error);
        wonContractId = existingContract.id;
      } else {
        const { data: inserted, error } = await admin
          .from("won_contracts")
          .insert(record)
          .select("id, success_fee")
          .maybeSingle();
        if (error) {
          console.error("record-outcome: contract insert failed", error);
          return json({ error: "Your win was saved but the fee record failed. Please contact support." }, 500);
        }
        wonContractId = inserted?.id ?? null;
        successFee = inserted?.success_fee ?? successFee;
      }
    }

    return json({
      status,
      tracker_id: tracker?.id ?? null,
      success_fee: successFee,
      currency: status === "won" ? currency : null,
      needs_fx_review: status === "won" ? currency !== "USD" : false,
      won_contract_id: wonContractId,
    });
  } catch (e) {
    console.error("record-outcome error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
