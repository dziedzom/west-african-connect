// Links a prospect company to a real account once they sign up, so their
// engagements, documents, bid work and commission records carry over.
// Admin-only; runs under the service role so the re-pointing is atomic.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { corsHeadersFor, createAdminClient } from "../_shared/entitlements.ts";

const cors = corsHeadersFor();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

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

    const admin = createAdminClient();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "convert");
    const prospectId = String(body?.prospect_id ?? "");
    if (!prospectId) return json({ error: "prospect_id is required" }, 400);

    const { data: prospect } = await admin
      .from("prospects")
      .select("id, company_name, contact_email, converted_user_id")
      .eq("id", prospectId)
      .maybeSingle();
    if (!prospect) return json({ error: "Prospect not found." }, 404);

    // Suggest matching accounts by contact email or company name.
    if (action === "candidates") {
      const email = (prospect.contact_email ?? "").trim().toLowerCase();
      const results: any[] = [];
      if (email) {
        const { data } = await admin
          .from("profiles")
          .select("user_id, company_name, email, location")
          .ilike("email", email);
        results.push(...(data ?? []));
      }
      const { data: byName } = await admin
        .from("profiles")
        .select("user_id, company_name, email, location")
        .ilike("company_name", `%${prospect.company_name}%`)
        .limit(10);
      for (const row of byName ?? []) {
        if (!results.some((r) => r.user_id === row.user_id)) results.push(row);
      }
      return json({ candidates: results });
    }

    if (action !== "convert") return json({ error: "Unknown action" }, 400);

    const targetUserId = String(body?.user_id ?? "");
    if (!targetUserId) return json({ error: "user_id is required" }, 400);

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("user_id, company_name, email")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!targetProfile) return json({ error: "That account was not found." }, 404);

    // Engagements carry the client account; documents, commissions, activity and
    // bid work all hang off the engagement, so nothing else needs re-pointing.
    const { data: engagements, error: engError } = await admin
      .from("engagements")
      .update({ client_user_id: targetUserId })
      .eq("prospect_id", prospectId)
      .select("id");
    if (engError) {
      console.error("convert-prospect: engagement update failed", engError);
      return json({ error: "Could not link the engagements. Please try again." }, 400);
    }

    const { error: prospectError } = await admin
      .from("prospects")
      .update({
        status: "converted",
        converted_user_id: targetUserId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", prospectId);
    if (prospectError) {
      console.error("convert-prospect: prospect update failed", prospectError);
      return json({ error: "Engagements were linked but the prospect record failed to update." }, 500);
    }

    return json({
      converted: true,
      user_id: targetUserId,
      account_email: targetProfile.email,
      engagements_linked: engagements?.length ?? 0,
    });
  } catch (e) {
    console.error("convert-prospect error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
