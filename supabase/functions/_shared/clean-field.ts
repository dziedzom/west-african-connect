/**
 * Extraction models and upstream portals sometimes emit the *word* "null"
 * (or "N/A", "-", "unknown") where a field is genuinely absent. Stored as text,
 * those values then behave like real data: they break country matching, show up
 * in filter dropdowns and count as populated fields.
 *
 * Use cleanTextField on every free-text field before storing it.
 */
const EMPTY_FIELD_VALUES = new Set([
  "", "null", "none", "n/a", "na", "n.a.", "-", "--", "undefined", "nil", "not specified",
  "not available", "unknown", "unspecified", "tbd", "to be determined", "no data",
]);

/** Returns a trimmed string, or null when the value is absent or a placeholder word. */
export function cleanTextField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (EMPTY_FIELD_VALUES.has(trimmed.toLowerCase().replace(/\s+/g, " "))) return null;
  return trimmed;
}
