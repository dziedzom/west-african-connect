// Telegram delivery for the alert channels the team actually watches.
//
// Every message is recorded in telegram_alert_log, and the unique index on
// (category, alert_key) means the same tender, portal or failure is never
// pushed twice. Categories can be muted individually in
// telegram_alert_settings, and thresholds live there too, so the channel can be
// tightened or loosened without a deploy.

// deno-lint-ignore-file no-explicit-any
type SupabaseClient = any;

export type TelegramCategory =
  | "prospect_match"
  | "priority_sector"
  | "candidate_portal"
  | "scraped_tender"
  | "scraper"
  | "test";

const MUTE_COLUMN: Record<TelegramCategory, string | null> = {
  prospect_match: "mute_prospect_match",
  priority_sector: "mute_priority_sector",
  candidate_portal: "mute_candidate_portal",
  scraped_tender: "mute_scraped_tender",
  scraper: "mute_scraper_alerts",
  test: null,
};

export interface TelegramSettings {
  enabled: boolean;
  chat_id: string | null;
  min_days_to_deadline: number;
  /** Per-sector override of the lead-time rule, e.g. { "Marketing": 3 }. */
  sector_lead_days: Record<string, number>;
  priority_sectors: string[];
  send_unknown_deadline: boolean;
  mute_prospect_match: boolean;
  mute_priority_sector: boolean;
  mute_candidate_portal: boolean;
  mute_scraped_tender: boolean;
  mute_scraper_alerts: boolean;
  max_messages_per_run: number;
  admin_base_url: string;
}

const DEFAULTS: TelegramSettings = {
  enabled: true,
  chat_id: null,
  min_days_to_deadline: 14,
  sector_lead_days: {},
  priority_sectors: [],
  send_unknown_deadline: false,
  mute_prospect_match: false,
  mute_priority_sector: false,
  mute_candidate_portal: false,
  mute_scraped_tender: false,
  mute_scraper_alerts: false,
  max_messages_per_run: 12,
  admin_base_url: "https://www.middlbrand.com",
};

/**
 * Tolerant sector comparison: casing and partial labels count, but only on word
 * boundaries — otherwise "Telecommunications" would match "Communications" and
 * telecoms tenders would arrive as marketing work.
 */
export function sectorLike(a?: string | null, b?: string | null): boolean {
  const x = (a ?? "").toLowerCase().trim();
  const y = (b ?? "").toLowerCase().trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const bounded = (haystack: string, needle: string) =>
    new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`)
      .test(haystack);
  return bounded(x, y) || bounded(y, x);
}

/**
 * Lead time required for a sector. Short-window sectors (UN marketing and
 * communications work routinely posts under two weeks out) can be set lower
 * than the global default without a deploy.
 */
export function leadDaysForSector(
  settings: TelegramSettings,
  sector?: string | null,
): number {
  const overrides = settings.sector_lead_days ?? {};
  for (const [key, days] of Object.entries(overrides)) {
    if (sectorLike(sector, key) && Number.isFinite(Number(days))) return Number(days);
  }
  return settings.min_days_to_deadline;
}

export async function loadTelegramSettings(
  supabase: SupabaseClient,
): Promise<TelegramSettings> {
  const { data } = await supabase
    .from("telegram_alert_settings").select("*").eq("id", true).maybeSingle();
  return { ...DEFAULTS, ...(data ?? {}) } as TelegramSettings;
}

export function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Plain-English time left, so the team can triage without counting days.
 * Calendar days are used (not 24h blocks) — a deadline later today reads
 * "closes today", tomorrow reads "1 day left".
 */
export function daysRemainingLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = (t: Date) => Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const days = Math.round((day(d) - day(new Date())) / 86_400_000);
  if (days < 0) return "closed";
  if (days === 0) return "closes today";
  if (days === 1) return "1 day left";
  if (days < 14) return `${days} days left`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks} weeks left`;
  const months = Math.round(days / 30);
  return `${months} months left`;
}

/** "Deadline: 2026-09-30 · 8 days left" — or "Deadline: not stated". */
export function deadlineLine(iso: string | null | undefined, unknownText = "not stated"): string {
  if (!iso) return `Deadline: ${unknownText}`;
  const date = new Date(iso).toISOString().slice(0, 10);
  const left = daysRemainingLabel(iso);
  return `Deadline: ${date}${left ? ` · <b>${left}</b>` : ""}`;
}

export interface TelegramResult {
  status: "sent" | "muted" | "duplicate" | "disabled" | "failed" | "no_chat" | "no_token";
  error?: string;
}

export async function sendTelegram(
  supabase: SupabaseClient,
  opts: {
    category: TelegramCategory;
    /** Stable identity of this alert, so it is only ever sent once. */
    key: string;
    subject: string;
    html: string;
    settings?: TelegramSettings;
    /** Bypass the per-category mute switch (used by the test message). */
    ignoreMute?: boolean;
  },
): Promise<TelegramResult> {
  const settings = opts.settings ?? await loadTelegramSettings(supabase);

  const record = async (status: string, error?: string, chatId?: string | null) => {
    await supabase.from("telegram_alert_log").insert({
      category: opts.category,
      alert_key: opts.key,
      chat_id: chatId ?? null,
      subject: opts.subject.slice(0, 300),
      status,
      error: error?.slice(0, 500) ?? null,
    }).then(() => {}, () => {});
  };

  if (!settings.enabled) {
    await record("disabled");
    return { status: "disabled" };
  }

  const muteColumn = MUTE_COLUMN[opts.category];
  if (!opts.ignoreMute && muteColumn && (settings as any)[muteColumn]) {
    await record("muted");
    return { status: "muted" };
  }

  // Already delivered? The unique index guarantees it, but checking first keeps
  // the log clean and avoids a pointless Telegram call.
  const { data: already } = await supabase
    .from("telegram_alert_log").select("id")
    .eq("category", opts.category).eq("alert_key", opts.key)
    .eq("status", "sent").limit(1);
  if (already && already.length > 0) return { status: "duplicate" };

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    await record("failed", "TELEGRAM_BOT_TOKEN is not configured");
    return { status: "no_token", error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const chatId = settings.chat_id || Deno.env.get("TELEGRAM_CHAT_ID");
  if (!chatId) {
    await record("failed", "No Telegram chat ID configured");
    return { status: "no_chat", error: "No Telegram chat ID configured" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: opts.html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const bodyText = await res.text();
    let ok = res.ok;
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.ok === false) ok = false;
    } catch { /* keep the HTTP verdict */ }

    if (!ok) {
      console.error(`Telegram send failed [${res.status}]: ${bodyText}`);
      await record("failed", `[${res.status}] ${bodyText}`, chatId);
      return { status: "failed", error: `[${res.status}] ${bodyText}` };
    }

    await record("sent", undefined, chatId);
    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await record("failed", message, chatId);
    return { status: "failed", error: message };
  }
}

/** Reads a plausible submission deadline out of a search snippet. */
export function parseDeadlineHint(text: string): string | null {
  const t = (text ?? "").replace(/\s+/g, " ");
  const months =
    "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)";
  const patterns = [
    new RegExp(`\\b(\\d{1,2})\\s+${months}\\.?\\s+(20\\d{2})\\b`, "i"),
    new RegExp(`\\b${months}\\.?\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "i"),
    /\b(20\d{2})-(\d{2})-(\d{2})\b/,
    /\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const parsed = new Date(
      /^\d{4}-/.test(m[0])
        ? m[0]
        : /^\d{1,2}[\/.]/.test(m[0])
          ? `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`
          : m[0].replace(/\./g, ""),
    );
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}
