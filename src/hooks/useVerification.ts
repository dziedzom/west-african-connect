import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "expired";

export interface VerificationRecord {
  id: string;
  user_id: string;
  legal_name: string | null;
  registration_number: string | null;
  registration_country: string | null;
  year_founded: number | null;
  status: VerificationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  verified_until: string | null;
}

export interface VerificationDocument {
  id: string;
  doc_type: string;
  file_name: string;
  size_bytes: number | null;
  uploaded_at: string;
}

export const useVerification = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRecord(null);
      setDocuments([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("company_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setRecord((data as VerificationRecord) ?? null);

    if (data) {
      const { data: docs } = await supabase
        .from("company_verification_documents")
        .select("id, doc_type, file_name, size_bytes, uploaded_at")
        .eq("verification_id", data.id)
        .order("uploaded_at", { ascending: true });
      setDocuments((docs as VerificationDocument[]) ?? []);
    } else {
      setDocuments([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const status: VerificationStatus = record?.status ?? "unverified";

  return {
    record,
    documents,
    loading,
    status,
    isVerified: status === "verified",
    reload: load,
  };
};
