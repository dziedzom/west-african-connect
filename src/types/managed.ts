import type { CommissionStatus, DocStatus, EngagementStage, ProspectStatus } from "@/lib/managed";

export interface Prospect {
  id: string;
  company_name: string;
  sector: string | null;
  capabilities: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  lead_source: string | null;
  status: ProspectStatus;
  notes: string | null;
  converted_user_id: string | null;
  converted_at: string | null;
  created_at: string;
}

export interface Engagement {
  id: string;
  prospect_id: string | null;
  client_user_id: string | null;
  rfp_id: string | null;
  manual_title: string | null;
  manual_buyer: string | null;
  manual_deadline: string | null;
  manual_source_url: string | null;
  stage: EngagementStage;
  stage_changed_at: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementDocument {
  id: string;
  engagement_id: string;
  name: string;
  doc_type: string | null;
  provided_by: "admin" | "company";
  status: DocStatus;
  due_date: string | null;
  notes: string | null;
  storage_path: string | null;
  external_location: string | null;
}

export interface EngagementActivity {
  id: string;
  engagement_id: string;
  activity_type: string;
  activity_date: string;
  note: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface EngagementCommission {
  id: string;
  engagement_id: string;
  project_value: number | null;
  currency: string;
  commission_rate: number;
  expected_commission: number | null;
  needs_fx_review: boolean;
  status: CommissionStatus;
  agreed_at: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  notes: string | null;
}

export interface EngagementPartnership {
  id: string;
  engagement_id: string | null;
  lead_prospect_id: string | null;
  lead_user_id: string | null;
  lead_label: string | null;
  lead_status: string;
  partner_prospect_id: string | null;
  partner_user_id: string | null;
  partner_label: string | null;
  partner_status: string;
  rationale: string | null;
  status: string;
  created_at: string;
}
