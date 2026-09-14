import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVerification } from "@/hooks/useVerification";
import VerificationBadge from "@/components/VerificationBadge";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BadgeCheck, FileUp, Trash2, ShieldCheck } from "lucide-react";

const locationGroups = [
  { region: "North Africa", countries: ["Algeria", "Egypt", "Libya", "Morocco", "Sudan", "Tunisia"] },
  { region: "West Africa", countries: ["Benin", "Burkina Faso", "Cabo Verde", "Côte d'Ivoire", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Liberia", "Mali", "Mauritania", "Niger", "Nigeria", "Senegal", "Sierra Leone", "Togo"] },
  { region: "Central Africa", countries: ["Cameroon", "Central African Republic", "Chad", "Congo (Brazzaville)", "Congo (DRC)", "Equatorial Guinea", "Gabon", "São Tomé and Príncipe"] },
  { region: "East Africa", countries: ["Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", "Madagascar", "Malawi", "Mauritius", "Mozambique", "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", "Uganda"] },
  { region: "Southern Africa", countries: ["Angola", "Botswana", "Eswatini", "Lesotho", "Namibia", "South Africa", "Zambia", "Zimbabwe"] },
  { region: "Other", countries: ["Other"] },
];

type DocType =
  | "certificate_of_incorporation"
  | "tax_clearance"
  | "business_licence"
  | "vat_or_tin"
  | "bank_letter"
  | "other";

const DOC_TYPES: { value: DocType; label: string; required: boolean; hint: string }[] = [
  { value: "certificate_of_incorporation", label: "Certificate of incorporation", required: true, hint: "Company registration certificate issued by your registrar." },
  { value: "tax_clearance", label: "Tax clearance certificate", required: true, hint: "Most recent valid tax clearance or compliance certificate." },
  { value: "business_licence", label: "Business licence or trade permit", required: false, hint: "If your country issues one for your sector." },
  { value: "vat_or_tin", label: "VAT / TIN certificate", required: false, hint: "Optional." },
  { value: "bank_letter", label: "Bank reference letter", required: false, hint: "Optional." },
];

const ACCEPT = ".pdf,.jpg,.jpeg,.png";
const MAX_BYTES = 10 * 1024 * 1024;

const CompanyVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { record, documents, loading, status, reload } = useVerification();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({ legal_name: "", registration_number: "", registration_country: "", year_founded: "" });

  useEffect(() => {
    if (record) {
      setForm({
        legal_name: record.legal_name ?? "",
        registration_number: record.registration_number ?? "",
        registration_country: record.registration_country ?? "",
        year_founded: record.year_founded ? String(record.year_founded) : "",
      });
    }
  }, [record]);

  const editable = status === "unverified" || status === "rejected" || status === "expired";

  const ensureRecord = async (): Promise<string | null> => {
    if (record) return record.id;
    if (!user) return null;
    const { data, error } = await supabase
      .from("company_verifications")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Could not start verification", description: error.message, variant: "destructive" });
      return null;
    }
    await reload();
    return data.id;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const id = await ensureRecord();
    if (!id) { setSaving(false); return; }

    const { error } = await supabase
      .from("company_verifications")
      .update({
        legal_name: form.legal_name || null,
        registration_number: form.registration_number || null,
        registration_country: form.registration_country || null,
        year_founded: form.year_founded ? Number(form.year_founded) : null,
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Details saved" });
      reload();
    }
  };

  const handleUpload = async (docType: DocType, file: File) => {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Each document must be 10MB or smaller.", variant: "destructive" });
      return;
    }
    setUploading(docType);
    const id = await ensureRecord();
    if (!id) { setUploading(null); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${user.id}/${id}/${docType}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("company-documents").upload(path, file, { upsert: false });
    if (uploadError) {
      setUploading(null);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("company_verification_documents").insert({
      verification_id: id,
      user_id: user.id,
      doc_type: docType,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });

    setUploading(null);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded" });
      reload();
    }
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("company_verification_documents").delete().eq("id", docId);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    } else {
      reload();
    }
  };

  const handleSubmit = async () => {
    if (!record) return;
    setSubmitting(true);
    await handleSave();
    const { data, error } = await supabase.functions.invoke("company-verification", {
      body: { action: "submit", verification_id: record.id },
    });
    setSubmitting(false);

    const message = (data as any)?.error ?? (error ? "Could not submit. Please try again." : null);
    if (message) {
      toast({ title: "Not submitted", description: message, variant: "destructive" });
    } else {
      toast({ title: "Submitted for review", description: "Our team reviews submissions within 48 hours." });
      reload();
    }
  };

  const missingRequired = DOC_TYPES.filter((d) => d.required && !documents.some((doc) => doc.doc_type === d.value));
  const detailsComplete = form.legal_name && form.registration_number && form.registration_country;

  if (loading) {
    return (
      <div className="container max-w-2xl py-12 space-y-4">
        <Skeleton className="h-8 w-56" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-md" />)}
      </div>
    );
  }

  return (
    <>
      <SEO title="Company Verification" path="/verification" description="Verify your company with MiddlBrand. Submit your registration details and documents for manual review." />
      <section className="py-12 bg-background min-h-screen">
        <div className="container max-w-2xl space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
              <h1 className="text-3xl font-display font-bold text-foreground">Company Verification</h1>
              <VerificationBadge status={status} />
            </div>
            <p className="mt-2 text-muted-foreground font-body text-sm">
              Verification is reviewed manually by our team. It confirms your company is a real, registered business —
              separate from your subscription.
            </p>
          </div>

          {status === "verified" && (
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
              <div className="flex items-center gap-2 font-display font-bold text-foreground">
                <BadgeCheck className="h-5 w-5 text-accent" aria-hidden="true" /> Your company is verified
              </div>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Verified {record?.reviewed_at ? format(new Date(record.reviewed_at), "d MMM yyyy") : "—"}
                {record?.verified_until && <> · valid until {format(new Date(record.verified_until), "d MMM yyyy")}</>}
              </p>
            </div>
          )}

          {status === "pending" && (
            <div className="rounded-2xl border border-border bg-muted/40 p-6">
              <p className="font-display font-bold text-foreground">Under review</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Submitted {record?.submitted_at ? format(new Date(record.submitted_at), "d MMM yyyy") : "—"}. Our team
                reviews submissions within 48 hours. Your details are locked while under review.
              </p>
            </div>
          )}

          {status === "rejected" && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <p className="font-display font-bold text-foreground">Not approved</p>
              <p className="mt-2 font-body text-sm text-foreground">{record?.rejection_reason}</p>
              <p className="mt-2 font-body text-xs text-muted-foreground">
                Correct the details or documents below and submit again.
              </p>
            </div>
          )}

          {status === "expired" && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <p className="font-display font-bold text-foreground">Verification expired</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Verification lasts 12 months. Refresh your documents below and submit again to renew.
              </p>
            </div>
          )}

          {/* Registration details */}
          <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
            <h2 className="font-display text-lg font-bold text-foreground">Registration details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal_name">Registered legal name *</Label>
                <Input id="legal_name" value={form.legal_name} disabled={!editable}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="As on your certificate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration number *</Label>
                <Input id="registration_number" value={form.registration_number} disabled={!editable}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="e.g. CS123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_country">Country of registration *</Label>
                <Select value={form.registration_country} disabled={!editable}
                  onValueChange={(v) => setForm({ ...form, registration_country: v })}>
                  <SelectTrigger id="registration_country"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {locationGroups.map((group) => (
                      <SelectGroup key={group.region}>
                        <SelectLabel className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">{group.region}</SelectLabel>
                        {group.countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_founded">Year founded</Label>
                <Input id="year_founded" type="number" min="1800" max={new Date().getFullYear()} value={form.year_founded}
                  disabled={!editable} onChange={(e) => setForm({ ...form, year_founded: e.target.value })} placeholder="e.g. 2014" />
              </div>
            </div>
            {editable && (
              <Button onClick={handleSave} disabled={saving} variant="outline" className="rounded-full font-semibold">
                {saving ? "Saving..." : "Save details"}
              </Button>
            )}
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Documents</h2>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                PDF, JPG or PNG, up to 10MB each. Only you and our review team can ever open these files.
              </p>
            </div>

            <ul className="space-y-4">
              {DOC_TYPES.map((doc) => {
                const uploaded = documents.filter((d) => d.doc_type === doc.value);
                return (
                  <li key={doc.value} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-body text-sm font-semibold text-foreground">
                          {doc.label} {doc.required && <span className="text-accent">*</span>}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">{doc.hint}</p>
                      </div>
                      {editable && (
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 font-body text-xs font-semibold hover:border-accent/50">
                          <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                          {uploading === doc.value ? "Uploading..." : "Upload"}
                          <input type="file" accept={ACCEPT} className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(doc.value, f); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                    {uploaded.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {uploaded.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                            <span className="font-body text-xs text-foreground truncate">{f.file_name}</span>
                            {editable && (
                              <button type="button" onClick={() => handleDelete(f.id)}
                                aria-label={`Remove ${f.file_name}`} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {editable && (
            <div className="space-y-3">
              {(!detailsComplete || missingRequired.length > 0) && (
                <p className="font-body text-xs text-muted-foreground">
                  Before submitting: {!detailsComplete && "complete the registration details"}
                  {!detailsComplete && missingRequired.length > 0 && "; "}
                  {missingRequired.length > 0 && `upload ${missingRequired.map((d) => d.label.toLowerCase()).join(" and ")}`}.
                </p>
              )}
              <Button onClick={handleSubmit} size="lg"
                disabled={submitting || !detailsComplete || missingRequired.length > 0}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                {submitting ? "Submitting..." : "Submit for verification"}
              </Button>
            </div>
          )}

          <p className="font-body text-xs text-muted-foreground">
            Need to update your company name, expertise or location? Edit your{" "}
            <Link to="/profile" className="underline">company profile</Link>.
          </p>
        </div>
      </section>
    </>
  );
};

export default CompanyVerification;
