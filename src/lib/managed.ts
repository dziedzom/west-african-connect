// Shared vocabulary for the managed bid workspace (admin-only).
import { useSearchParams } from "react-router-dom";

export const ENGAGEMENT_STAGES = [
  "identified",
  "documents_assembling",
  "bid_drafting",
  "offer_made",
  "terms_agreed",
  "submitted",
  "shortlisted",
  "won",
  "lost",
] as const;
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];

export const STAGE_LABELS: Record<EngagementStage, string> = {
  identified: "Identified",
  documents_assembling: "Documents assembling",
  bid_drafting: "Bid drafting",
  offer_made: "Offer made",
  terms_agreed: "Terms agreed",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  won: "Won",
  lost: "Lost",
};

export const OPEN_STAGES = ENGAGEMENT_STAGES.filter((s) => s !== "won" && s !== "lost");

export const DOC_STATUSES = [
  "required",
  "requested",
  "received",
  "verified",
  "signed",
  "submitted",
  "not_applicable",
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  required: "Required",
  requested: "Requested",
  received: "Received",
  verified: "Verified",
  signed: "Signed",
  submitted: "Submitted",
  not_applicable: "Not applicable",
};

export const COLLECTED_DOC_STATUSES: DocStatus[] = ["received", "verified", "signed", "submitted"];

export const PROSPECT_STATUSES = [
  "new",
  "contacted",
  "interested",
  "engaged",
  "converted",
  "dormant",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const COMMISSION_STATUSES = ["projected", "agreed", "invoiced", "paid", "written_off"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  projected: "Projected",
  agreed: "Agreed",
  invoiced: "Invoiced",
  paid: "Paid",
  written_off: "Written off",
};

export const PAIRING_SIDE_STATUSES = ["proposed", "approached", "accepted", "declined"] as const;
export const PAIRING_STATUSES = ["proposed", "in_discussion", "agreed", "abandoned"] as const;

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "meeting",
  "site_visit",
  "email",
  "document_request",
  "negotiation",
  "submission",
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  call: "Call",
  meeting: "Meeting",
  site_visit: "Site visit",
  email: "Email",
  document_request: "Document request",
  negotiation: "Negotiation",
  submission: "Submission",
};

export const CURRENCIES = [
  "USD", "NGN", "KES", "GHS", "ZAR", "ETB", "TZS", "UGX", "RWF", "XOF", "MAD", "EGP", "EUR", "GBP",
];

export const DEFAULT_COMMISSION_RATE = 20;

export const formatMoney = (value: number | null | undefined, currency = "USD") => {
  if (value === null || value === undefined) return "—";
  return `${currency} ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Bid Studio tools read this to attribute saved work to a managed engagement. */
export const useEngagementParam = () => {
  const [params] = useSearchParams();
  return params.get("engagement");
};
