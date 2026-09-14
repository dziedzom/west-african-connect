// Company verification: server-side actions that clients are not allowed to
// perform directly. Database triggers block any client write to status, review
// and decision fields, so every transition goes through here.
//
// Actions:
//   submit        (owner)  unverified|rejected|expired -> pending
//   approve       (admin)  pending -> verified, 12-month expiry, reviewer recorded
//   reject        (admin)  pending -> rejected, reason recorded
//   document_url  (owner or admin) short-lived signed URL for one document
//   expire_sweep  (admin or cron secret) verified past expiry -> expired

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { createAdminClient, corsHeadersFor } from "../_shared/entitlements.ts";

const cors = corsHeadersFor();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const REQUIRED_DOCS = ["certificate_of_incorporation", "tax_clearance"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const admin = createAdminClient();

    // Cron-triggered sweep uses a shared secret instead of a user session.
    const cronSecret = req.headers.get("x-cron-secret");
    if (action === "expire_sweep" && cronSecret && cronSecret === Deno.env.get("SCRAPE_CRON_SECRET")) {
      return json(await expireSweep(admin));
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in." }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Please sign in." }, 401);

    const { data: adminRole } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!adminRole;

    if (action === "submit") {
      const { data: record } = await admin
        .from("company_verifications").select("*").eq("id", body.verification_id).maybeSingle();
      if (!record || record.user_id !== user.id) return json({ error: "Verification not found." }, 404);
      if (!["unverified", "rejected", "expired"].includes(record.status)) {
        return json({ error: "This submission is already under review." }, 409);
      }
      if (!record.legal_name || !record.registration_number || !record.registration_country) {
        return json({ error: "Add your legal name, registration number and country of registration first." }, 400);
      }

      const { data: docs } = await admin
        .from("company_verification_documents").select("doc_type").eq("verification_id", record.id);
      const have = new Set((docs ?? []).map((d) => d.doc_type));
      const missing = REQUIRED_DOCS.filter((d) => !have.has(d));
      if (missing.length) {
        return json({ error: "Upload the required documents before submitting.", missing_documents: missing }, 400);
      }

      const { error } = await admin
        .from("company_verifications")
        .update({
          status: "pending",
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", record.id);
      if (error) throw error;
      return json({ status: "pending" });
    }

    if (action === "approve" || action === "reject") {
      if (!isAdmin) return json({ error: "Admins only." }, 403);
      const { data: record } = await admin
        .from("company_verifications").select("id, status").eq("id", body.verification_id).maybeSingle();
      if (!record) return json({ error: "Verification not found." }, 404);
      if (record.status !== "pending") return json({ error: "Only pending submissions can be reviewed." }, 409);

      const now = new Date();
      const patch: Record<string, unknown> = {
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
        review_notes: body.review_notes ?? null,
      };
      if (action === "approve") {
        const until = new Date(now);
        until.setUTCFullYear(until.getUTCFullYear() + 1);
        patch.status = "verified";
        patch.verified_until = until.toISOString().slice(0, 10);
        patch.rejection_reason = null;
      } else {
        const reason = String(body.rejection_reason ?? "").trim();
        if (!reason) return json({ error: "A rejection reason is required." }, 400);
        patch.status = "rejected";
        patch.rejection_reason = reason;
      }

      const { error } = await admin.from("company_verifications").update(patch).eq("id", record.id);
      if (error) throw error;
      return json({ status: patch.status });
    }

    if (action === "document_url") {
      const { data: doc } = await admin
        .from("company_verification_documents").select("user_id, storage_path").eq("id", body.document_id).maybeSingle();
      if (!doc) return json({ error: "Document not found." }, 404);
      if (!isAdmin && doc.user_id !== user.id) return json({ error: "Not allowed." }, 403);

      const { data: signed, error } = await admin.storage
        .from("company-documents").createSignedUrl(doc.storage_path, 300);
      if (error || !signed) return json({ error: "Could not open that document." }, 500);
      return json({ url: signed.signedUrl });
    }

    if (action === "expire_sweep") {
      if (!isAdmin) return json({ error: "Admins only." }, 403);
      return json(await expireSweep(admin));
    }

    return json({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("company-verification error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

async function expireSweep(admin: ReturnType<typeof createAdminClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("company_verifications")
    .update({ status: "expired" })
    .eq("status", "verified")
    .lt("verified_until", today)
    .select("id");
  if (error) throw error;
  console.log(`company-verification: expired ${data?.length ?? 0} record(s)`);
  return { expired: data?.length ?? 0 };
}
