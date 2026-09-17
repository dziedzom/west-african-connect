import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Briefcase, Plus } from "lucide-react";
import ProspectsPanel from "@/components/managed/ProspectsPanel";
import SectorDemandPanel from "@/components/managed/SectorDemandPanel";
import {
  ENGAGEMENT_STAGES,
  STAGE_LABELS,
  formatMoney,
  type EngagementStage,
  type LiveListing,
} from "@/lib/managed";
import type { Engagement, EngagementCommission, Prospect } from "@/types/managed";

interface ProfileLite { user_id: string; company_name: string | null; email: string | null }
interface RfpLite { id: string; title: string; deadline: string | null; portal: string | null }

const AdminManaged = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [commissions, setCommissions] = useState<EngagementCommission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [rfps, setRfps] = useState<Record<string, RfpLite>>({});
  const [liveListings, setLiveListings] = useState<LiveListing[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, e, c, pr, live] = await Promise.all([
      supabase.from("prospects").select("*").order("created_at", { ascending: false }),
      supabase.from("engagements").select("*").order("updated_at", { ascending: false }),
      supabase.from("engagement_commissions").select("*"),
      supabase.from("profiles").select("user_id, company_name, email"),
      supabase
        .from("scraped_rfps")
        .select("id, title, category, location, organization, deadline, status, source_url, value_amount, value_currency")
        .in("status", ["open", "closing_soon"])
        .eq("africa_relevant", true)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(1000),
    ]);
    setProspects((p.data as Prospect[]) ?? []);
    setLiveListings((live.data as LiveListing[]) ?? []);
    const engagementRows = (e.data as Engagement[]) ?? [];
    setEngagements(engagementRows);
    setCommissions((c.data as EngagementCommission[]) ?? []);
    setProfiles(Object.fromEntries(((pr.data as ProfileLite[]) ?? []).map((r) => [r.user_id, r])));

    const rfpIds = engagementRows.map((r) => r.rfp_id).filter(Boolean) as string[];
    if (rfpIds.length > 0) {
      const { data } = await supabase.from("scraped_rfps").select("id, title, deadline, portal").in("id", rfpIds);
      setRfps(Object.fromEntries(((data as RfpLite[]) ?? []).map((r) => [r.id, r])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const prospectById = useMemo(
    () => Object.fromEntries(prospects.map((p) => [p.id, p])),
    [prospects],
  );

  const companyLabel = (row: Engagement) => {
    if (row.client_user_id) {
      const profile = profiles[row.client_user_id];
      return profile?.company_name || profile?.email || "Account holder";
    }
    return row.prospect_id ? prospectById[row.prospect_id]?.company_name ?? "Unknown company" : "Unassigned";
  };

  const opportunityLabel = (row: Engagement) =>
    (row.rfp_id ? rfps[row.rfp_id]?.title : null) ?? row.manual_title ?? "Untitled opportunity";

  const commissionFor = (engagementId: string) => commissions.find((c) => c.engagement_id === engagementId);

  const createEngagement = async () => {
    if (!newCompany.trim() || !newTitle.trim()) {
      toast({ title: "Company and opportunity title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .insert({ company_name: newCompany.trim(), status: "engaged", created_by: user?.id ?? null })
      .select("*")
      .maybeSingle();
    if (prospectError || !prospect) {
      setSaving(false);
      toast({ title: "Could not create the engagement", description: "Please try again.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("engagements").insert({
      prospect_id: prospect.id,
      manual_title: newTitle.trim(),
      manual_buyer: newBuyer.trim() || null,
      manual_source_url: newSourceUrl.trim() || null,
      internal_notes: newNotes.trim() || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create the engagement", description: "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Engagement created" });
    setCreateOpen(false);
    setNewCompany(""); setNewTitle(""); setNewBuyer(""); setNewSourceUrl(""); setNewNotes("");
    load();
  };

  const open = engagements.filter((r) => r.stage !== "won" && r.stage !== "lost");
  const won = engagements.filter((r) => r.stage === "won");
  const lost = engagements.filter((r) => r.stage === "lost");
  const decided = won.length + lost.length;
  const expectedOpen = open.reduce((sum, r) => sum + (commissionFor(r.id)?.expected_commission ?? 0), 0);
  const expectedWon = won.reduce((sum, r) => sum + (commissionFor(r.id)?.expected_commission ?? 0), 0);

  const byStage = (stage: EngagementStage) => engagements.filter((r) => r.stage === stage);

  return (
    <div className="container py-8 space-y-8">
      <SEO title="Managed Bid Workspace | MiddlBrand Admin" description="Run bids on behalf of companies." />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link>
          </Button>
          <h1 className="text-3xl font-display font-bold">Managed Bid Workspace</h1>
          <p className="text-muted-foreground mt-1">Bids you run on behalf of companies, on 20% commission.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full font-semibold"><Plus className="h-4 w-4 mr-2" /> New engagement</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New engagement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Reach Marketing" />
                <p className="text-xs text-muted-foreground mt-1">Creates a prospect record you can flesh out and later convert.</p>
              </div>
              <div>
                <Label htmlFor="title">Opportunity</Label>
                <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Tender title" />
              </div>
              <div>
                <Label htmlFor="buyer">Buyer / authority</Label>
                <Input id="buyer" value={newBuyer} onChange={(e) => setNewBuyer(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="url">Source link</Label>
                <Input id="url" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder="https://" />
              </div>
              <div>
                <Label htmlFor="notes">Internal notes</Label>
                <Textarea id="notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createEngagement} disabled={saving}>{saving ? "Creating…" : "Create engagement"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Open engagements", value: open.length },
          { label: "Won", value: won.length },
          { label: "Lost", value: lost.length },
          { label: "Win rate", value: decided > 0 ? `${Math.round((won.length / decided) * 100)}%` : "—" },
          { label: "Prospects", value: prospects.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{stat.label}</CardTitle></CardHeader>
            <CardContent>{loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{stat.value}</p>}</CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Engagements</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="sectors">Sector demand</TabsTrigger>
          <TabsTrigger value="pipeline">Commission pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : engagements.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              No engagements yet. Create one to start running a bid on a company's behalf.
            </CardContent></Card>
          ) : (
            ENGAGEMENT_STAGES.map((stage) => {
              const rows = byStage(stage);
              if (rows.length === 0) return null;
              return (
                <Card key={stage}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {STAGE_LABELS[stage]} <Badge variant="secondary">{rows.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {rows.map((row) => {
                      const commission = commissionFor(row.id);
                      return (
                        <Link
                          key={row.id}
                          to={`/admin/managed/engagements/${row.id}`}
                          className="block rounded-lg border p-4 hover:border-accent transition-colors"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{companyLabel(row)}</p>
                              <p className="text-sm text-muted-foreground truncate">{opportunityLabel(row)}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-mono">
                                {commission?.expected_commission
                                  ? formatMoney(commission.expected_commission, commission.currency)
                                  : "No value yet"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {row.client_user_id ? "Platform account" : "Prospect"} · updated {format(new Date(row.updated_at), "d MMM")}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="prospects">
          <ProspectsPanel prospects={prospects} engagements={engagements} liveListings={liveListings} onChanged={load} />
        </TabsContent>

        <TabsContent value="sectors">
          <SectorDemandPanel listings={liveListings} />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Expected commission (open)</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold">{formatMoney(expectedOpen)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Commission on wins</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold text-accent">{formatMoney(expectedWon)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Collected</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {formatMoney(commissions.filter((c) => c.status === "paid").reduce((s, c) => s + (c.expected_commission ?? 0), 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Briefcase className="h-4 w-4" /> Commission by engagement</CardTitle></CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commission records yet. Add project values on an engagement.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Project value</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c) => {
                      const engagement = engagements.find((e) => e.id === c.engagement_id);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{engagement ? companyLabel(engagement) : "—"}</TableCell>
                          <TableCell>{engagement ? STAGE_LABELS[engagement.stage] : "—"}</TableCell>
                          <TableCell>{formatMoney(c.project_value, c.currency)}</TableCell>
                          <TableCell>{c.commission_rate}%</TableCell>
                          <TableCell className="font-semibold">{formatMoney(c.expected_commission, c.currency)}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === "paid" ? "default" : "secondary"} className="capitalize">
                              {c.status.replace("_", " ")}
                            </Badge>
                            {c.needs_fx_review && <Badge variant="outline" className="ml-2">Check rate</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManaged;
