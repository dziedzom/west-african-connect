// Shared alerting for the scraper pipeline.
// Every alert is persisted in scrape_alert_log (the audit trail) and, when
// email infrastructure is available, emailed to the project admin.
// Throttling prevents the same failure from emailing on every batch.

// deno-lint-ignore-file no-explicit-any
type SupabaseClient = any;

export type AlertType = "auth_failure" | "source_auto_disabled" | "heartbeat_stale" | "test";

const THROTTLE_MINUTES: Record<AlertType, number> = {
  auth_failure: 60,
  source_auto_disabled: 1440,
  heartbeat_stale: 1440,
  test: 0,
};

const EMAIL_TEMPLATE = "scrape-alert";

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
        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: EMAIL_TEMPLATE,
            recipientEmail: adminEmail,
            idempotencyKey: `${alert.key}-${Math.floor(Date.now() / 60_000)}`,
            templateData: {
              subject: alert.subject,
              severity: alert.severity ?? "warning",
              detail: alert.detail,
              alertType: alert.type,
              occurredAt: new Date().toISOString(),
            },
          },
        });
        if (error) {
          emailStatus = "failed";
          emailError = (error as Error).message ?? String(error);
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

  console.log(`[alert:${alert.type}] ${alert.subject} -> email ${emailStatus}`);

  return {
    recorded: true,
    throttled,
    email_status: emailStatus,
    email_to: adminEmail,
    email_error: emailError ?? undefined,
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
