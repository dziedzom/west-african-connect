// Shared alerting for the scraper pipeline.
// Every alert is persisted in scrape_alert_log (the audit trail) and, when
// email infrastructure is available, emailed to the project admin.
// Throttling prevents the same failure from emailing on every batch.

// deno-lint-ignore-file no-explicit-any
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.3.0";
import { escapeHtml, sendTelegram } from "./telegram.ts";
type SupabaseClient = any;

export type AlertType = "auth_failure" | "source_auto_disabled" | "heartbeat_stale" | "test";

const THROTTLE_MINUTES: Record<AlertType, number> = {
  auth_failure: 60,
  source_auto_disabled: 1440,
  heartbeat_stale: 1440,
  test: 0,
};

const SITE_NAME = "MiddlBrand Connect";
const SENDER_DOMAIN = "notify.middlbrand.com";

function renderAlertEmail(alert: AlertInput, occurredAt: string) {
  const severity = alert.severity ?? "warning";
  const html = `<!doctype html><html><body style="margin:0;padding:32px;background:#FAFAFA;font-family:Inter,Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E5;border-radius:16px;padding:28px;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">Scraper monitoring &middot; ${severity}</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;letter-spacing:-0.02em;">${alert.subject}</h1>
    <pre style="margin:0 0 20px;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.6;color:#1A1A1A;">${alert.detail}</pre>
    <p style="margin:0;font-size:12px;color:#737373;">Alert type: ${alert.type} &middot; ${occurredAt}</p>
  </div>
</body></html>`;
  const text = `[${severity.toUpperCase()}] ${alert.subject}\n\n${alert.detail}\n\nAlert type: ${alert.type}\n${occurredAt}`;
  return { html, text };
}

async function resolveAdminEmail(supabase: SupabaseClient): Promise<string | null> {
  const fromEnv = Deno.env.get("ADMIN_EMAIL");
  if (fromEnv) return fromEnv;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1);
  const adminId = roles?.[0]?.user_id;
  if (!adminId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", adminId)
    .maybeSingle();
  return profile?.email ?? null;
}

async function isThrottled(
  supabase: SupabaseClient,
  alertKey: string,
  minutes: number,
): Promise<boolean> {
  if (minutes <= 0) return false;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data } = await supabase
    .from("scrape_alert_log")
    .select("id")
    .eq("alert_key", alertKey)
    .eq("email_status", "sent")
    .gte("created_at", since)
    .limit(1);
  return !!data && data.length > 0;
}

export interface AlertInput {
  type: AlertType;
  /** Stable identity of this failure so repeats are throttled, not re-sent. */
  key: string;
  severity?: "critical" | "warning";
  subject: string;
  detail: string;
}

export interface AlertOutcome {
  recorded: boolean;
  throttled: boolean;
  email_status: string;
  email_to: string | null;
  email_error?: string;
  telegram_status?: string;
}

export async function sendScrapeAlert(
  supabase: SupabaseClient,
  alert: AlertInput,
): Promise<AlertOutcome> {
  const throttleMinutes = THROTTLE_MINUTES[alert.type] ?? 60;
  const throttled = await isThrottled(supabase, alert.key, throttleMinutes);

  const adminEmail = throttled ? null : await resolveAdminEmail(supabase);
  let emailStatus = throttled ? "throttled" : "pending";
  let emailError: string | null = null;

  if (!throttled) {
    if (!adminEmail) {
      emailStatus = "no_recipient";
      emailError = "No admin email address available";
    } else {
      try {
        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
        const occurredAt = new Date().toISOString();
        const { html, text } = renderAlertEmail(alert, occurredAt);
        const res = await sendLovableEmail(
          {
            to: adminEmail,
            from: { name: `${SITE_NAME} Alerts`, address: `alerts@${SENDER_DOMAIN}` },
            sender_domain: SENDER_DOMAIN,
            subject: `[${(alert.severity ?? "warning").toUpperCase()}] ${alert.subject}`,
            html,
            text,
            purpose: "transactional",
            label: alert.type,
            idempotency_key: `${alert.key}-${Math.floor(Date.now() / 60_000)}`,
          },
          { apiKey },
        );
        if (res?.success === false) {
          emailStatus = "failed";
          emailError = `send rejected: ${JSON.stringify(res)}`;
        } else {
          emailStatus = "sent";
        }
      } catch (e) {
        emailStatus = "failed";
        emailError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  await supabase.from("scrape_alert_log").insert({
    alert_type: alert.type,
    alert_key: alert.key,
    severity: alert.severity ?? "warning",
    subject: alert.subject.slice(0, 300),
    detail: alert.detail.slice(0, 4000),
    email_to: adminEmail,
    email_status: emailStatus,
    email_error: emailError?.slice(0, 500) ?? null,
  }).then(() => {}, () => {});

  // Same alert, second channel. The key carries the throttle bucket so a daily
  // heartbeat failure repeats daily instead of being deduped away forever.
  let telegramStatus = "skipped";
  if (!throttled) {
    const bucketMinutes = Math.max(throttleMinutes, 1);
    const bucket = Math.floor(Date.now() / (bucketMinutes * 60_000));
    const tg = await sendTelegram(supabase, {
      category: "scraper",
      key: `${alert.key}:${bucket}`,
      subject: alert.subject,
      html: [
        `${(alert.severity ?? "warning") === "critical" ? "🚨" : "⚠️"} <b>${escapeHtml(alert.subject)}</b>`,
        `<pre>${escapeHtml(alert.detail.slice(0, 2500))}</pre>`,
      ].join("\n"),
    }).catch(() => ({ status: "failed" as const }));
    telegramStatus = tg.status;
  }

  console.log(`[alert:${alert.type}] ${alert.subject} -> email ${emailStatus}, telegram ${telegramStatus}`);

  return {
    recorded: true,
    throttled,
    email_status: emailStatus,
    email_to: adminEmail,
    email_error: emailError ?? undefined,
    telegram_status: telegramStatus,
  };
}

/** Detects credential/authorization failures in any upstream response. */
export function detectAuthFailure(status: number, bodyText: string): boolean {
  if (status === 401 || status === 403) return true;
  const t = (bodyText || "").toLowerCase();
  return (
    t.includes("invalid token") ||
    t.includes("unauthorized") ||
    t.includes("invalid api key") ||
    t.includes("credentials not found") ||
    t.includes("lovable_api_key_not_registered")
  );
}
