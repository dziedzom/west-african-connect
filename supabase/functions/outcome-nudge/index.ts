// Daily nudge: asks companies to report the result of opportunities whose
// deadline has passed and where no outcome was recorded.
//
// One digest email per company per week at most, and never more than three
// nudges for the same opportunity.

// deno-lint-ignore-file no-explicit-any
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.3.0";
import { corsHeadersFor, createAdminClient } from "../_shared/entitlements.ts";

const cors = corsHeadersFor();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SENDER_DOMAIN = "notify.middlbrand.com";
const SITE_URL = "https://www.middlbrand.com";
const OPEN_STATUSES = ["interested", "preparing", "submitted"];

const renderDigest = (companyName: string, rows: { title: string; deadline: string | null; rfp_id: string }[]) => {
  const items = rows
    .map(
      (r) =>
        `<li style="margin:0 0 10px;font-size:14px;line-height:1.5;">${r.title}${
          r.deadline ? ` <span style="color:#737373;">— closed ${new Date(r.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>` : ""
        }</li>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:32px;background:#FAFAFA;font-family:Inter,Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:16px;padding:28px;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">MiddlBrand</p>
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;letter-spacing:-0.02em;">How did these bids go?</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hello${companyName ? ` ${companyName}` : ""} — the deadline has passed on ${rows.length} ${rows.length === 1 ? "opportunity" : "opportunities"} you were tracking. One tap each tells us the result, and keeps your match scores honest.</p>
    <ul style="margin:0 0 20px;padding-left:18px;">${items}</ul>
    <a href="${SITE_URL}/dashboard#outcomes" style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:16px;font-size:14px;font-weight:600;">Report the results</a>
    <p style="margin:20px 0 0;font-size:12px;color:#737373;">We ask at most once a week, and at most three times per opportunity.</p>
  </div>
</body></html>`;

  const text = `How did these bids go?\n\n${rows
    .map((r) => `- ${r.title}${r.deadline ? ` (closed ${r.deadline.slice(0, 10)})` : ""}`)
    .join("\n")}\n\nReport the results: ${SITE_URL}/dashboard#outcomes`;

  return { html, text };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Scheduled invocation uses the shared cron secret; an admin may also run it.
  const cronSecret = Deno.env.get("SCRAPE_CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");
  const admin = createAdminClient();

  if (!cronSecret || providedSecret !== cronSecret) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);
  }

  try {
    const now = Date.now();
    const oldest = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
    const newest = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await admin
      .from("opportunity_tracker")
      .select("id, user_id, rfp_id, nudge_count, last_nudge_at, snooze_until, scraped_rfps!inner(title, deadline)")
      .in("status", OPEN_STATUSES)
      .lt("nudge_count", 3)
      .gte("scraped_rfps.deadline", oldest)
      .lte("scraped_rfps.deadline", newest);

    if (error) throw error;

    const due = (rows ?? []).filter((r: any) => {
      if (r.snooze_until && new Date(r.snooze_until).getTime() > now) return false;
      if (r.last_nudge_at && r.last_nudge_at > weekAgo) return false;
      return true;
    });

    const byUser = new Map<string, any[]>();
    for (const r of due) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    for (const [userId, list] of byUser) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, company_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.email) continue;

      const items = list.map((r: any) => ({
        rfp_id: r.rfp_id,
        title: r.scraped_rfps?.title ?? "Opportunity",
        deadline: r.scraped_rfps?.deadline ?? null,
      }));

      let sent = false;
      try {
        if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
        const { html, text } = renderDigest(profile.company_name ?? "", items);
        const res = await sendLovableEmail(
          {
            to: profile.email,
            from: { name: "MiddlBrand", address: `notifications@${SENDER_DOMAIN}` },
            sender_domain: SENDER_DOMAIN,
            subject: items.length === 1 ? "How did this bid go?" : `How did these ${items.length} bids go?`,
            html,
            text,
            purpose: "transactional",
            label: "outcome_nudge",
            idempotency_key: `outcome-nudge-${userId}-${new Date().toISOString().slice(0, 10)}`,
          },
          { apiKey },
        );
        sent = res?.success !== false;
      } catch (e) {
        console.error("outcome-nudge: send failed", e);
      }

      if (sent) emailsSent++;
      else emailsFailed++;

      const stamp = new Date().toISOString();
      for (const r of list) {
        await admin
          .from("opportunity_tracker")
          .update({ nudge_count: (r.nudge_count ?? 0) + 1, last_nudge_at: stamp })
          .eq("id", r.id);
      }
    }

    const result = {
      ok: true,
      candidates: rows?.length ?? 0,
      due: due.length,
      users_nudged: byUser.size,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    };
    console.log("outcome-nudge", JSON.stringify(result));
    return json(result);
  } catch (e) {
    console.error("outcome-nudge error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
