import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, FileText, Plus, Upload } from "lucide-react";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  COLLECTED_DOC_STATUSES,
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABELS,
  CURRENCIES,
  DEFAULT_COMMISSION_RATE,
  DOC_STATUSES,
  DOC_STATUS_LABELS,
  ENGAGEMENT_STAGES,
  PAIRING_SIDE_STATUSES,
  PAIRING_STATUSES,
  STAGE_LABELS,
  formatMoney,
  titleCase,
  type DocStatus,
  type EngagementStage,
} from "@/lib/managed";
import type {
  Engagement,
  EngagementActivity,
  EngagementCommission,
  EngagementDocument,
  EngagementPartnership,
  Prospect,
} from "@/types/managed";

interface BidWork {
  analyses: { id: string; title: string; created_at: string }[];
  drafts: { id: string; rfp_title: string | null; status: string | null; created_at: string }[];
  reviews: { id: string; rfp_title: string | null; overall_score: number | null; grade: string | null; created_at: string }[];
  checklists: { id: string; title: string; created_at: string }[];
}

const AdminEngagement = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [clientLabel, setClientLabel] = useState<string | null>(null);
  const [rfpTitle, setRfpTitle] = useState<string | null>(null);
  const [documents, setDocuments] = useState<EngagementDocument[]>([]);
  const [activities, setActivities] = useState<EngagementActivity[]>([]);
  const [commission, setCommission] = useState<EngagementCommission | null>(null);
  const [pairings, setPairings] = useState<EngagementPartnership[]>([]);
  const [bidWork, setBidWork] = useState<BidWork>({ analyses: [], drafts: [], reviews: [], checklists: [] });

  const [notes, setNotes] = useState("");
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", doc_type: "", provided_by: "company", status: "required", due_date: "", external_location: "", notes: "" });
  const [activityForm, setActivityForm] = useState({ activity_type: "note", note: "", is_internal: false });
  const [commissionForm, setCommissionForm] = useState({ project_value: "", currency: "USD", commission_rate: String(DEFAULT_COMMISSION_RATE), status: "projected", notes: "" });
  const [pairingForm, setPairingForm] = useState({ lead_label: "", partner_label: "", rationale: "", status: "proposed" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const [e, d, a, c, p] = await Promise.all([
      supabase.from("engagements").select("*").eq("id", id).maybeSingle(),
      supabase.from("engagement_documents").select("*").eq("engagement_id", id).order("created_at"),
      supabase.from("engagement_activities").select("*").eq("engagement_id", id).order("activity_date", { ascending: false }),
      supabase.from("engagement_commissions").select("*").eq("engagement_id", id).maybeSingle(),
      supabase.from("engagement_partnerships").select("*").eq("engagement_id", id).order("created_at"),
    ]);

    const row = (e.data as Engagement) ?? null;
    setEngagement(row);
    setNotes(row?.internal_notes ?? "");
    setDocuments((d.data as EngagementDocument[]) ?? []);
    setActivities((a.data as EngagementActivity[]) ?? []);
    setPairings((p.data as EngagementPartnership[]) ?? []);

    const commissionRow = (c.data as EngagementCommission) ?? null;
    setCommission(commissionRow);
    if (commissionRow) {
      setCommissionForm({
        project_value: commissionRow.project_value !== null ? String(commissionRow.project_value) : "",
        currency: commissionRow.currency,
        commission_rate: String(commissionRow.commission_rate),
        status: commissionRow.status,
        notes: commissionRow.notes ?? "",
      });
    }

    if (row?.prospect_id) {
      const { data } = await supabase.from("prospects").select("*").eq("id", row.prospect_id).maybeSingle();
      setProspect((data as Prospect) ?? null);
    }
    if (row?.client_user_id) {
      const { data } = await supabase.from("profiles").select("company_name, email").eq("user_id", row.client_user_id).maybeSingle();
      setClientLabel((data as any)?.company_name || (data as any)?.email || "Platform account");
    }
    if (row?.rfp_id) {
      const { data } = await supabase.from("scraped_rfps").select("title").eq("id", row.rfp_id).maybeSingle();
      setRfpTitle((data as any)?.title ?? null);
    }

    const [an, dr, rv, cl] = await Promise.all([
      supabase.from("bid_analyses").select("id, title, created_at").eq("engagement_id", id).order("created_at", { ascending: false }),
      supabase.from("bid_drafts").select("id, rfp_title, status, created_at").eq("engagement_id", id).order("created_at", { ascending: false }),
      supabase.from("bid_reviews").select("id, rfp_title, overall_score, grade, created_at").eq("engagement_id", id).order("created_at", { ascending: false }),
      supabase.from("submission_checklists").select("id, title, created_at").eq("engagement_id", id).order("created_at", { ascending: false }),
    ]);
    setBidWork({
      analyses: (an.data as any) ?? [],
      drafts: (dr.data as any) ?? [],
      reviews: (rv.data as any) ?? [],
      checklists: (cl.data as any) ?? [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const companyName = clientLabel ?? prospect?.company_name ?? "Unassigned company";
  const opportunity = rfpTitle ?? engagement?.manual_title ?? "Untitled opportunity";

  const collected = documents.filter((d) => COLLECTED_DOC_STATUSES.includes(d.status)).length;
  const outstanding = documents.filter((d) => d.status === "required" || d.status === "requested");

  const studioLink = (path: string) => `${path}?engagement=${id}`;

  const setStage = async (stage: EngagementStage) => {
    if (!engagement) return;
    const { error } = await supabase
      .from("engagements")
      .update({ stage, stage_changed_at: new Date().toISOString() })
      .eq("id", engagement.id);
    if (error) {
      toast({ title: "Could not update the stage", variant: "destructive" });
      return;
    }
    setEngagement({ ...engagement, stage });
    toast({ title: `Moved to ${STAGE_LABELS[stage]}` });
  };

  const saveNotes = async () => {
    if (!engagement) return;
    setBusy(true);
    const { error } = await supabase.from("engagements").update({ internal_notes: notes || null }).eq("id", engagement.id);
    setBusy(false);
    toast({ title: error ? "Could not save notes" : "Notes saved", variant: error ? "destructive" : undefined });
  };

  const addDocument = async () => {
    if (!id || !docForm.name.trim()) {
      toast({ title: "A document name is required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("engagement_documents").insert({
      engagement_id: id,
      name: docForm.name.trim(),
      doc_type: docForm.doc_type.trim() || null,
      provided_by: docForm.provided_by,
      status: docForm.status,
      due_date: docForm.due_date || null,
      external_location: docForm.external_location.trim() || null,
      notes: docForm.notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not add the document", variant: "destructive" });
      return;
    }
    setDocDialog(false);
    setDocForm({ name: "", doc_type: "", provided_by: "company", status: "required", due_date: "", external_location: "", notes: "" });
    load();
  };

  const setDocStatus = async (docId: string, status: DocStatus) => {
    const { error } = await supabase.from("engagement_documents").update({ status }).eq("id", docId);
    if (error) { toast({ title: "Could not update", variant: "destructive" }); return; }
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, status } : d)));
  };

  const uploadDoc = async (docId: string, file: File) => {
    if (!engagement) return;
    const owner = engagement.client_user_id ?? engagement.prospect_id ?? engagement.id;
    const path = `${engagement.id}/${owner}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await supabase.storage.from("engagement-documents").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("engagement_documents").update({ storage_path: path, status: "received" }).eq("id", docId);
    toast({ title: "File attached" });
    load();
  };

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from("engagement-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const addActivity = async () => {
    if (!id || !activityForm.note.trim()) {
      toast({ title: "Write what happened first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("engagement_activities").insert({
      engagement_id: id,
      activity_type: activityForm.activity_type,
      note: activityForm.note.trim(),
      is_internal: activityForm.is_internal,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not log that", variant: "destructive" }); return; }
    setActivityForm({ activity_type: "note", note: "", is_internal: false });
    load();
  };

  const saveCommission = async () => {
    if (!id) return;
    setBusy(true);
    const payload = {
      engagement_id: id,
      project_value: commissionForm.project_value ? Number(commissionForm.project_value) : null,
      currency: commissionForm.currency,
      commission_rate: Number(commissionForm.commission_rate),
      status: commissionForm.status,
      notes: commissionForm.notes.trim() || null,
      agreed_at: commissionForm.status === "agreed" ? new Date().toISOString() : undefined,
      invoiced_at: commissionForm.status === "invoiced" ? new Date().toISOString() : undefined,
      paid_at: commissionForm.status === "paid" ? new Date().toISOString() : undefined,
    };
    const { error } = commission
      ? await supabase.from("engagement_commissions").update(payload).eq("id", commission.id)
      : await supabase.from("engagement_commissions").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Could not save the commission", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Commission saved" });
    load();
  };

  const addPairing = async () => {
    if (!id || !pairingForm.lead_label.trim() || !pairingForm.partner_label.trim()) {
      toast({ title: "Name both companies", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("engagement_partnerships").insert({
      engagement_id: id,
      lead_label: pairingForm.lead_label.trim(),
      partner_label: pairingForm.partner_label.trim(),
      rationale: pairingForm.rationale.trim() || null,
      status: pairingForm.status,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast({ title: "Could not save the pairing", description: error.message, variant: "destructive" }); return; }
    setPairingForm({ lead_label: "", partner_label: "", rationale: "", status: "proposed" });
    load();
  };

  const setPairingSide = async (pairingId: string, field: "lead_status" | "partner_status" | "status", value: string) => {
    const { error } = await supabase.from("engagement_partnerships").update({ [field]: value }).eq("id", pairingId);
    if (error) { toast({ title: "Could not update", variant: "destructive" }); return; }
    setPairings((prev) => prev.map((p) => (p.id === pairingId ? { ...p, [field]: value } : p)));
  };

  if (loading) {
    return <div className="container py-8 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!engagement) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-muted-foreground">This engagement no longer exists.</p>
        <Button asChild variant="outline"><Link to="/admin/managed">Back to the workspace</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <SEO title={`${companyName} — Managed Engagement | MiddlBrand Admin`} description="Managed bid engagement detail." />

      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/admin/managed"><ArrowLeft className="h-4 w-4 mr-1" /> Managed workspace</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{companyName}</h1>
            <p className="text-muted-foreground mt-1">{opportunity}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant={engagement.client_user_id ? "default" : "secondary"}>
                {engagement.client_user_id ? "Platform account" : "Prospect"}
              </Badge>
              {engagement.manual_buyer && <Badge variant="outline">{engagement.manual_buyer}</Badge>}
              {engagement.manual_deadline && (
                <Badge variant="outline">Closes {format(new Date(engagement.manual_deadline), "d MMM yyyy")}</Badge>
              )}
              {engagement.manual_source_url && (
                <a href={engagement.manual_source_url} target="_blank" rel="noreferrer" className="text-sm text-accent inline-flex items-center gap-1">
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Label className="text-xs text-muted-foreground">Stage</Label>
            <Select value={engagement.stage} onValueChange={(v) => setStage(v as EngagementStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Since {format(new Date(engagement.stage_changed_at), "d MMM yyyy")}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents ({collected}/{documents.length})</TabsTrigger>
          <TabsTrigger value="bid-work">Bid work</TabsTrigger>
          <TabsTrigger value="pairing">Pairing</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Documents collected</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{collected}/{documents.length || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Expected commission</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatMoney(commission?.expected_commission, commission?.currency ?? "USD")}</p>
                <p className="text-xs text-muted-foreground mt-1">{commission ? `${commission.commission_rate}% of project value` : "Not set yet"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Bid work saved</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {bidWork.analyses.length + bidWork.drafts.length + bidWork.reviews.length + bidWork.checklists.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {prospect && !engagement.client_user_id && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Company profile</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {prospect.sector && <p><span className="text-muted-foreground">Sector:</span> {prospect.sector}</p>}
                {prospect.location && <p><span className="text-muted-foreground">Location:</span> {prospect.location}</p>}
                {prospect.capabilities && <p><span className="text-muted-foreground">Capabilities:</span> {prospect.capabilities}</p>}
                {prospect.contact_email && <p><span className="text-muted-foreground">Contact:</span> {prospect.contact_name} {prospect.contact_email}</p>}
              </CardContent>
            </Card>
          )}

          {outstanding.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Outstanding documents</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {outstanding.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3">
                    <span>{d.name}</span>
                    <Badge variant="outline">{DOC_STATUS_LABELS[d.status]}{d.due_date ? ` · due ${format(new Date(d.due_date), "d MMM")}` : ""}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Internal notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Negotiation position, contacts, next steps…" />
              <p className="text-xs text-muted-foreground">Only you see this. The company never does.</p>
              <Button onClick={saveNotes} disabled={busy} variant="outline">Save notes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setDocDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add document
            </Button>
          </div>
          {documents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              List what this tender requires, then track what's collected.
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Provided by</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Where it sits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <p className="font-medium">{d.name}</p>
                          {d.doc_type && <p className="text-xs text-muted-foreground">{d.doc_type}</p>}
                        </TableCell>
                        <TableCell className="capitalize">{d.provided_by === "admin" ? "MiddlBrand" : "Company"}</TableCell>
                        <TableCell>
                          <Select value={d.status} onValueChange={(v) => setDocStatus(d.id, v as DocStatus)}>
                            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{DOC_STATUS_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{d.due_date ? format(new Date(d.due_date), "d MMM yyyy") : "—"}</TableCell>
                        <TableCell className="space-y-1">
                          {d.storage_path ? (
                            <Button size="sm" variant="outline" onClick={() => openDoc(d.storage_path!)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> Open file
                            </Button>
                          ) : (
                            <label className="inline-flex items-center gap-1 text-sm text-accent cursor-pointer">
                              <Upload className="h-3.5 w-3.5" /> Upload
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(d.id, f); }}
                              />
                            </label>
                          )}
                          {d.external_location && <p className="text-xs text-muted-foreground">{d.external_location}</p>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bid-work" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Work on this engagement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Open a Bid Studio tool from here and whatever you save is filed against this engagement instead of your own history.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link to={studioLink("/bid-studio/analyser")}>Analyser</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to={studioLink("/bid-studio/writer")}>Writer</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to={studioLink("/bid-studio/reviewer")}>Reviewer</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to={studioLink("/bid-studio/checklist")}>Checklist</Link></Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Analyses</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bidWork.analyses.length === 0 ? <p className="text-muted-foreground">None yet</p> : bidWork.analyses.map((a) => (
                  <p key={a.id}>{a.title} <span className="text-muted-foreground text-xs">· {format(new Date(a.created_at), "d MMM")}</span></p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Drafts</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bidWork.drafts.length === 0 ? <p className="text-muted-foreground">None yet</p> : bidWork.drafts.map((d) => (
                  <p key={d.id}>{d.rfp_title || "Untitled draft"} <span className="text-muted-foreground text-xs">· {d.status}</span></p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bidWork.reviews.length === 0 ? <p className="text-muted-foreground">None yet</p> : bidWork.reviews.map((r) => (
                  <p key={r.id}>{r.rfp_title || "Untitled"} <span className="text-muted-foreground text-xs">· {r.overall_score} ({r.grade})</span></p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Checklists</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bidWork.checklists.length === 0 ? <p className="text-muted-foreground">None yet</p> : bidWork.checklists.map((c) => (
                  <p key={c.id}>{c.title}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pairing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Propose a pairing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Lead company</Label><Input value={pairingForm.lead_label} onChange={(e) => setPairingForm({ ...pairingForm, lead_label: e.target.value })} /></div>
                <div><Label>Partner company</Label><Input value={pairingForm.partner_label} onChange={(e) => setPairingForm({ ...pairingForm, partner_label: e.target.value })} /></div>
              </div>
              <div><Label>Why they fit together</Label><Textarea rows={3} value={pairingForm.rationale} onChange={(e) => setPairingForm({ ...pairingForm, rationale: e.target.value })} /></div>
              <Button onClick={addPairing} disabled={busy} variant="outline">Add pairing</Button>
            </CardContent>
          </Card>

          {pairings.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{p.lead_label} + {p.partner_label}</CardTitle>
                  <Select value={p.status} onValueChange={(v) => setPairingSide(p.id, "status", v)}>
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAIRING_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {p.rationale && <p className="text-muted-foreground">{p.rationale}</p>}
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{p.lead_label} (lead)</Label>
                    <Select value={p.lead_status} onValueChange={(v) => setPairingSide(p.id, "lead_status", v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAIRING_SIDE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{p.partner_label} (partner)</Label>
                    <Select value={p.partner_status} onValueChange={(v) => setPairingSide(p.id, "partner_status", v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAIRING_SIDE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="commission">
          <Card>
            <CardHeader><CardTitle className="text-lg">Commission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Project value</Label>
                  <Input type="number" min="0" value={commissionForm.project_value} onChange={(e) => setCommissionForm({ ...commissionForm, project_value: e.target.value })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={commissionForm.currency} onValueChange={(v) => setCommissionForm({ ...commissionForm, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commission rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.5" value={commissionForm.commission_rate} onChange={(e) => setCommissionForm({ ...commissionForm, commission_rate: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select value={commissionForm.status} onValueChange={(v) => setCommissionForm({ ...commissionForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMISSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{COMMISSION_STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={commissionForm.notes} onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Expected commission</p>
                <p className="text-2xl font-bold">{formatMoney(commission?.expected_commission, commission?.currency ?? commissionForm.currency)}</p>
                {commission?.needs_fx_review && (
                  <p className="text-xs text-muted-foreground mt-1">Not in dollars — confirm the rate before invoicing.</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Worked out by the system when you save. Separate from the 3.5% self-serve success fee.
                </p>
              </div>
              <Button onClick={saveCommission} disabled={busy}>Save commission</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Log something</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select value={activityForm.activity_type} onValueChange={(v) => setActivityForm({ ...activityForm, activity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visibility</Label>
                  <Select value={activityForm.is_internal ? "internal" : "shared"} onValueChange={(v) => setActivityForm({ ...activityForm, is_internal: v === "internal" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Company can see it</SelectItem>
                      <SelectItem value="internal">Private to me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>What happened</Label><Textarea rows={3} value={activityForm.note} onChange={(e) => setActivityForm({ ...activityForm, note: e.target.value })} /></div>
              <Button onClick={addActivity} disabled={busy} variant="outline">Add to timeline</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : activities.map((a) => (
                <div key={a.id} className="border-l-2 border-border pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{ACTIVITY_TYPE_LABELS[a.activity_type] ?? titleCase(a.activity_type)}</p>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.activity_date), "d MMM yyyy")}</span>
                    {a.is_internal && <Badge variant="outline" className="text-xs">Private</Badge>}
                  </div>
                  {a.note && <p className="text-sm text-muted-foreground mt-1">{a.note}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} placeholder="Certificate of incorporation" /></div>
            <div><Label>Type</Label><Input value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })} placeholder="Registration, tax, financial…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provided by</Label>
                <Select value={docForm.provided_by} onValueChange={(v) => setDocForm({ ...docForm, provided_by: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="admin">MiddlBrand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={docForm.status} onValueChange={(v) => setDocForm({ ...docForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{DOC_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due date</Label><Input type="date" value={docForm.due_date} onChange={(e) => setDocForm({ ...docForm, due_date: e.target.value })} /></div>
            <div><Label>Where it sits (if not uploaded here)</Label><Input value={docForm.external_location} onChange={(e) => setDocForm({ ...docForm, external_location: e.target.value })} placeholder="With the company's lawyer, email thread…" /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={addDocument} disabled={busy}>Add document</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEngagement;
