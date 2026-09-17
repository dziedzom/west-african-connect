export type RFPSource = "local" | "scraped" | "external";

export interface RFP {
  id: string;
  title: string;
  description: string;
  category: string;
  org: string | null;
  location: string | null;
  value: string | null;
  budget: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  source: RFPSource;
  source_url?: string | null;
  portal?: string | null;
  africa_relevant?: boolean;
  /** Structured value recorded verbatim from the notice or tender documents. */
  value_amount?: number | null;
  value_currency?: string | null;
  value_basis?: string | null;
  value_evidence?: string | null;
  value_source_url?: string | null;
  official_source_url?: string | null;
  document_urls?: string[] | null;
}

/** Formats a recorded value for display. Returns null when no value was recorded. */
export function formatRecordedValue(rfp: RFP): string | null {
  if (rfp.value_amount == null || !isFinite(rfp.value_amount)) return null;
  const currency = (rfp.value_currency || "USD").toUpperCase();
  const amount = rfp.value_amount;
  const abs = Math.abs(amount);
  const short = abs >= 1_000_000
    ? `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
    : abs >= 1_000
      ? `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`
      : amount.toLocaleString("en-GB");
  return `${currency} ${short}`;
}

const BASIS_LABELS: Record<string, string> = {
  estimated_budget: "Estimated budget",
  ceiling: "Ceiling / maximum",
  contract_award: "Awarded amount",
  range_upper: "Upper end of stated range",
  other: "Stated value",
};

export function valueBasisLabel(basis: string | null | undefined): string | null {
  if (!basis) return null;
  return BASIS_LABELS[basis] ?? "Stated value";
}
