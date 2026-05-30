import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import type { RFP } from "@/types/rfp";
import {
  FileEdit, Plus, Trash2, Send, ArrowLeft, Save,
  Clock, CheckCircle2, Eye, Trophy, XCircle, Brain, Sparkles
} from "lucide-react";

type ProposalStatus = "draft" | "submitted" | "under_review" | "won" | "lost";

interface Proposal {
  id: string;
  user_id: string;
  rfp_id: string | null;
  title: string;
  content: string;
  status: ProposalStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<ProposalStatus, { icon: typeof Clock; label: string; className: string }> = {
  draft: { icon: FileEdit, label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  submitted: { icon: Send, label: "Submitted", className: "bg-accent/10 text-accent border-accent/20" },
  under_review: { icon: Eye, label: "Under Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  won: { icon: Trophy, label: "Won", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  lost: { icon: XCircle, label: "Lost", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ProposalBuilder = () => {
  const { user, loading: authLoading } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rfpId, setRfpId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  const fetchProposals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setProposals((data as Proposal[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchRfps = async () => {
      const { data } = await supabase.from("rfps").select("*").eq("status", "open");
      setRfps((data as RFP[]) || []);
    };
    Promise.all([fetchProposals(), fetchRfps()]);
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setRfpId("");
  };

  const startEdit = (p: Proposal) => {
    setEditing(p);
    setTitle(p.title);
    setContent(p.content);
    setRfpId(p.rfp_id || "");
  };

  const handleSave = async (submitAfterSave = false) => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const status: ProposalStatus = submitAfterSave ? "submitted" : "draft";
    const payload = {
      title: title.trim(),
      content,
      rfp_id: rfpId || null,
      status,
      submitted_at: submitAfterSave ? new Date().toISOString() : null,
      user_id: user.id,
    };

    if (editing) {
      const { error } = await supabase
        .from("proposals")
        .update(payload)
        .eq("id", editing.id);
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else toast({ title: submitAfterSave ? "Proposal submitted!" : "Draft saved" });
    } else {
      const { error } = await supabase.from("proposals").insert(payload);
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else toast({ title: submitAfterSave ? "Proposal submitted!" : "Draft created" });
    }
    setSaving(false);
    resetForm();
    fetchProposals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("proposals").delete().eq("id", id);
    toast({ title: "Proposal deleted" });
    fetchProposals();
  };

  const isFormOpen = editing !== null || title || content;

  const handleAIDraft = async () => {
    if (!rfpId) {
      toast({ title: "Select an RFP first", description: "Link an RFP to generate an AI draft.", variant: "destructive" });
      return;
    }
    setAiDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-proposal", {
        body: { rfp_id: rfpId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.title) setTitle(data.title);
      if (data?.content) setContent(data.content);
      toast({ title: "AI draft generated!", description: "Review and edit before submitting." });
    } catch (e: any) {
      toast({ title: "AI drafting failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setAiDrafting(false);
    }
  };

  return (
    <>
      <SEO title="Proposal Builder" path="/proposals" description="Draft, edit, track, and submit winning proposals against African RFPs with MiddlBrand's AI-assisted proposal builder." />
      <section className="py-12 bg-background min-h-screen grain-mesh">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-accent" />
              <h1 className="text-3xl font-display font-bold text-foreground">Proposal Builder</h1>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
              </Button>
              {!isFormOpen && (
                <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setEditing({} as Proposal)}>
                  <Plus className="h-4 w-4 mr-1" /> New Proposal
                </Button>
              )}
            </div>
          </div>

          {/* Editor */}
          {isFormOpen && (
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-8">
              <h2 className="text-sm font-display font-bold mb-4">{editing?.id ? "Edit Proposal" : "New Proposal"}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-display text-muted-foreground mb-1 block">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposal title" />
                </div>
                <div>
                  <label className="text-xs font-display text-muted-foreground mb-1 block">Link to RFP (optional)</label>
                  <Select value={rfpId} onValueChange={setRfpId}>
                    <SelectTrigger><SelectValue placeholder="Select an RFP" /></SelectTrigger>
                    <SelectContent>
                      {rfps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-display text-muted-foreground">Proposal Content</label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/10"
                      onClick={handleAIDraft}
                      disabled={aiDrafting || !rfpId}
                    >
                      {aiDrafting ? (
                        <>
                          <Brain className="h-3.5 w-3.5 animate-pulse" /> Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> AI Draft
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your proposal here or use AI Draft to auto-generate..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={resetForm}>Cancel</Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleSave(false)} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> Save Draft
                  </Button>
                  <Button size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleSave(true)} disabled={saving}>
                    <Send className="h-4 w-4 mr-1" /> Submit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Proposals List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileEdit className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No proposals yet.</p>
              <p className="text-xs mt-1">Click "New Proposal" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => {
                const config = statusConfig[p.status];
                const Icon = config.icon;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 flex items-center justify-between gap-4 hover:border-accent/30 transition-all cursor-pointer"
                    onClick={() => startEdit(p)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-display font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground font-body mt-1">
                        Updated {new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${config.className}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ProposalBuilder;
