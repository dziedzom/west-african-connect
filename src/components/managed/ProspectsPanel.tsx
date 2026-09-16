import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserCheck } from "lucide-react";
import { PROSPECT_STATUSES, titleCase } from "@/lib/managed";
import type { Engagement, Prospect } from "@/types/managed";

interface Candidate { user_id: string; company_name: string | null; email: string | null; location: string | null }

const emptyForm = {
  company_name: "",
  sector: "",
  capabilities: "",
  location: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  lead_source: "",
  status: "new",
  notes: "",
};

const ProspectsPanel = ({
  prospects,
  engagements,
  onChanged,
}: {
  prospects: Prospect[];
  engagements: Engagement[];
  onChanged: () => void;
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [convertFor, setConvertFor] = useState<Prospect | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chosenUser, setChosenUser] = useState("");
  const [converting, setConverting] = useState(false);

  const set = (key: keyof typeof emptyForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const startCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const startEdit = (prospect: Prospect) => {
    setEditing(prospect);
    setForm({
      company_name: prospect.company_name ?? "",
      sector: prospect.sector ?? "",
      capabilities: prospect.capabilities ?? "",
      location: prospect.location ?? "",
      contact_name: prospect.contact_name ?? "",
      contact_email: prospect.contact_email ?? "",
      contact_phone: prospect.contact_phone ?? "",
      lead_source: prospect.lead_source ?? "",
      status: prospect.status,
      notes: prospect.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.company_name.trim()) {
      toast({ title: "A company name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      sector: form.sector.trim() || null,
      capabilities: form.capabilities.trim() || null,
      location: form.location.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      lead_source: form.lead_source.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("prospects").update(payload).eq("id", editing.id)
      : await supabase.from("prospects").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Prospect updated" : "Prospect added" });
    setOpen(false);
    onChanged();
  };

  const startConvert = async (prospect: Prospect) => {
    setConvertFor(prospect);
    setChosenUser("");
    setCandidates([]);
    const { data } = await supabase.functions.invoke("convert-prospect", {
      body: { action: "candidates", prospect_id: prospect.id },
    });
    setCandidates(((data as any)?.candidates as Candidate[]) ?? []);
  };

  const confirmConvert = async () => {
    if (!convertFor || !chosenUser) return;
    setConverting(true);
    const { data, error } = await supabase.functions.invoke("convert-prospect", {
      body: { action: "convert", prospect_id: convertFor.id, user_id: chosenUser },
    });
    setConverting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not convert", description: (data as any)?.error ?? "Please try again.", variant: "destructive" });
      return;
    }
    toast({
      title: `${convertFor.company_name} is now linked`,
      description: `${(data as any)?.engagements_linked ?? 0} engagement(s) will appear in their dashboard.`,
    });
    setConvertFor(null);
    onChanged();
  };

  const countFor = (prospectId: string) => engagements.filter((e) => e.prospect_id === prospectId).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startCreate} variant="outline" className="rounded-full">
          <Plus className="h-4 w-4 mr-2" /> Add prospect
        </Button>
      </div>

      {prospects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No prospects yet. Add the companies you're targeting.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prospects.map((prospect) => (
            <Card key={prospect.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{prospect.company_name}</CardTitle>
                  <Badge variant={prospect.status === "converted" ? "default" : "secondary"}>{titleCase(prospect.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {prospect.sector && <p className="text-muted-foreground">{prospect.sector}{prospect.location ? ` · ${prospect.location}` : ""}</p>}
                {prospect.capabilities && <p className="line-clamp-2">{prospect.capabilities}</p>}
                {(prospect.contact_name || prospect.contact_email) && (
                  <p className="text-muted-foreground">
                    {prospect.contact_name}{prospect.contact_name && prospect.contact_email ? " · " : ""}{prospect.contact_email}
                  </p>
                )}
                {prospect.notes && <p className="text-muted-foreground italic line-clamp-2">{prospect.notes}</p>}
                <p className="text-xs text-muted-foreground">{countFor(prospect.id)} engagement(s)</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(prospect)}>Edit</Button>
                  {prospect.status !== "converted" && (
                    <Button size="sm" variant="outline" onClick={() => startConvert(prospect)}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Convert
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit prospect" : "Add prospect"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company name</Label><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sector</Label><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            </div>
            <div><Label>Capabilities</Label><Textarea rows={3} value={form.capabilities} onChange={(e) => set("capabilities", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></div>
              <div><Label>Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></div>
              <div><Label>Lead source</Label><Input value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertFor} onOpenChange={(v) => !v && setConvertFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link {convertFor?.company_name} to their account</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Their engagements, documents and bid work will appear in that account's dashboard, already populated.
              Commission figures and internal notes stay private to you.
            </p>
            {candidates.length === 0 ? (
              <p className="text-muted-foreground">No matching account found yet — ask them to sign up first, then try again.</p>
            ) : (
              <Select value={chosenUser} onValueChange={setChosenUser}>
                <SelectTrigger><SelectValue placeholder="Choose the account" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.company_name || "No company name"} — {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmConvert} disabled={!chosenUser || converting}>
              {converting ? "Linking…" : "Link account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectsPanel;
