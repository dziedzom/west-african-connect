import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import VerificationBadge from "@/components/VerificationBadge";
import type { VerificationStatus } from "@/hooks/useVerification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, ShieldCheck } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  legal_name: string | null;
  registration_number: string | null;
  registration_country: string | null;
  year_founded: number | null;
  status: VerificationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  verified_until: string | null;
}

interface Doc {
  id: string;
  verification_id: string;
  doc_type: string;
  file_name: string;
}

interface ProfileLite {
  user_id: string;
  company_name: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
}

const REJECTION_REASONS = [
  "Documents unreadable or incomplete",
  "Registration number does not match the certificate",
  "Documents expired",
  "Company details do not match the profile",
  "Other (see notes)",
];

const TABS: { value: VerificationStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
];

const AdminVerifications = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: verifications }, { data: documents }, { data: profileRows }] = await Promise.all([
      supabase.from("company_verifications").select("*").order("submitted_at", { ascending: true, nullsFirst: false }),
      supabase.from("company_verification_documents").select("id, verification_id, doc_type, file_name"),
      supabase.from("profiles").select("user_id, company_name, email, website, location"),
    ]);
    setRows((verifications as Row[]) ?? []);
    setDocs((documents as Doc[]) ?? []);
    setProfiles(Object.fromEntries(((profileRows as ProfileLite[]) ?? []).map((p) => [p.user_id, p])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDocument = async (documentId: string) => {
    const { data, error } = await supabase.functions.invoke("company-verification", {
      body: { action: "document_url", document_id: documentId },
    });
    const url = (data as any)?.url;
    if (error || !url) {
      toast({ title: "Could not open document", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const review = async (row: Row, action: "approve" | "reject") => {
    if (action === "reject" && !reasons[row.id]) {
      toast({ title: "Choose a rejection reason", variant: "destructive" });
      return;
    }
    setBusy(row.id);
    const { data, error } = await supabase.functions.invoke("company-verification", {
      body: {
        action,
        verification_id: row.id,
        review_notes: notes[row.id] || null,
        rejection_reason: action === "reject"
          ? [reasons[row.id], notes[row.id]].filter(Boolean).join(" — ")
          : null,
      },
    });
    setBusy(null);

    const message = (data as any)?.error ?? (error ? "Review failed. Please try again." : null);
    if (message) {
      toast({ title: "Not saved", description: message, variant: "destructive" });
    } else {
      toast({ title: action === "approve" ? "Company verified" : "Submission rejected" });
      load();
    }
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const renderRow = (row: Row) => {
    const profile = profiles[row.user_id];
    const rowDocs = docs.filter((d) => d.verification_id === row.id);
    const years = row.year_founded ? new Date().getFullYear() - row.year_founded : null;

    return (
      <Card key={row.id}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-lg font-display">
            {profile?.company_name || row.legal_name || "Unnamed company"}
          </CardTitle>
          <VerificationBadge status={row.status} />
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 font-body text-sm">
            <div><dt className="text-muted-foreground text-xs">Legal name</dt><dd>{row.legal_name || "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Registration number</dt><dd>{row.registration_number || "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Country of registration</dt><dd>{row.registration_country || "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Years operating</dt><dd>{years !== null ? `${years} (founded ${row.year_founded})` : "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Contact email</dt><dd>{profile?.email || "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Website</dt><dd className="truncate">{profile?.website || "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Submitted</dt><dd>{row.submitted_at ? format(new Date(row.submitted_at), "d MMM yyyy HH:mm") : "—"}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Reviewed</dt><dd>{row.reviewed_at ? format(new Date(row.reviewed_at), "d MMM yyyy") : "—"}</dd></div>
          </dl>

          <div>
            <p className="font-body text-xs text-muted-foreground mb-2">Documents ({rowDocs.length})</p>
            {rowDocs.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {rowDocs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                    <span className="font-body text-xs">
                      <span className="font-semibold capitalize">{d.doc_type.replace(/_/g, " ")}</span> · {d.file_name}
                    </span>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openDocument(d.id)}>
                      <FileText className="h-3 w-3 mr-1" /> View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {row.status === "pending" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor={`notes-${row.id}`} className="text-xs">Internal notes (never shown to the company)</Label>
                <Textarea id={`notes-${row.id}`} rows={2} value={notes[row.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                  placeholder="Checked registrar record, numbers match." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Rejection reason (shown to the company)</Label>
                <Select value={reasons[row.id] || ""} onValueChange={(v) => setReasons({ ...reasons, [row.id]: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a reason (only needed to reject)" /></SelectTrigger>
                  <SelectContent>{REJECTION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button disabled={busy === row.id} onClick={() => review(row, "approve")}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  Approve
                </Button>
                <Button disabled={busy === row.id} variant="destructive" className="rounded-full font-semibold"
                  onClick={() => review(row, "reject")}>
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border pt-4 font-body text-xs text-muted-foreground space-y-1">
              {row.rejection_reason && <p><span className="font-semibold">Reason given:</span> {row.rejection_reason}</p>}
              {row.review_notes && <p><span className="font-semibold">Notes:</span> {row.review_notes}</p>}
              {row.verified_until && <p><span className="font-semibold">Valid until:</span> {format(new Date(row.verified_until), "d MMM yyyy")}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SEO title="Verification Queue" path="/admin/verifications" description="Admin review queue for company verification submissions." />
      <div className="container py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            <h1 className="text-3xl font-display font-bold">Verification Queue</h1>
          </div>
          <p className="font-body text-sm text-muted-foreground">{pendingCount} awaiting review</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
            {TABS.map((t) => {
              const list = t.value === "all" ? rows : rows.filter((r) => r.status === t.value);
              return (
                <TabsContent key={t.value} value={t.value} className="space-y-4">
                  {list.length === 0
                    ? <p className="font-body text-sm text-muted-foreground py-8">Nothing here.</p>
                    : list.map(renderRow)}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </>
  );
};

export default AdminVerifications;
