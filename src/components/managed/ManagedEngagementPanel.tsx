import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Sparkles } from "lucide-react";
import {
  ACTIVITY_TYPE_LABELS,
  COLLECTED_DOC_STATUSES,
  DOC_STATUS_LABELS,
  STAGE_LABELS,
  titleCase,
  type DocStatus,
  type EngagementStage,
} from "@/lib/managed";

interface ClientEngagement {
  id: string;
  stage: EngagementStage;
  stage_changed_at: string;
  manual_title: string | null;
  manual_buyer: string | null;
  manual_deadline: string | null;
  rfp_id: string | null;
}

interface ClientDoc { id: string; name: string; status: DocStatus; due_date: string | null; provided_by: string; storage_path: string | null }
interface ClientActivity { id: string; activity_type: string; activity_date: string; note: string | null }

const ManagedEngagementPanel = () => {
  const [engagements, setEngagements] = useState<ClientEngagement[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, ClientDoc[]>>({});
  const [activities, setActivities] = useState<Record<string, ClientActivity[]>>({});
  const [work, setWork] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("engagements")
        .select("id, stage, stage_changed_at, manual_title, manual_buyer, manual_deadline, rfp_id")
        .order("updated_at", { ascending: false });
      const rows = (data as ClientEngagement[]) ?? [];
      setEngagements(rows);
      if (rows.length === 0) return;

      const ids = rows.map((r) => r.id);
      const rfpIds = rows.map((r) => r.rfp_id).filter(Boolean) as string[];

      const [d, a, an, dr] = await Promise.all([
        supabase.from("engagement_documents").select("id, engagement_id, name, status, due_date, provided_by, storage_path").in("engagement_id", ids),
        supabase.from("engagement_activities").select("id, engagement_id, activity_type, activity_date, note").in("engagement_id", ids).order("activity_date", { ascending: false }),
        supabase.from("bid_analyses").select("id, engagement_id").in("engagement_id", ids),
        supabase.from("bid_drafts").select("id, engagement_id").in("engagement_id", ids),
      ]);

      const groupBy = <T extends { engagement_id: string }>(list: T[] | null) => {
        const out: Record<string, T[]> = {};
        (list ?? []).forEach((row) => { (out[row.engagement_id] ||= []).push(row); });
        return out;
      };
      setDocs(groupBy((d.data as any) ?? []) as Record<string, ClientDoc[]>);
      setActivities(groupBy((a.data as any) ?? []) as Record<string, ClientActivity[]>);

      const counts: Record<string, number> = {};
      [...((an.data as any) ?? []), ...((dr.data as any) ?? [])].forEach((row: any) => {
        counts[row.engagement_id] = (counts[row.engagement_id] ?? 0) + 1;
      });
      setWork(counts);

      if (rfpIds.length > 0) {
        const { data: rfpRows } = await supabase.from("scraped_rfps").select("id, title").in("id", rfpIds);
        setTitles(Object.fromEntries(((rfpRows as any[]) ?? []).map((r) => [r.id, r.title])));
      }
    };
    load();
  }, []);

  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from("engagement-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (engagements.length === 0) return null;

  return (
    <Card className="border-accent/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> Bids MiddlBrand is running for you
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {engagements.map((e) => {
          const engagementDocs = docs[e.id] ?? [];
          const collected = engagementDocs.filter((d) => COLLECTED_DOC_STATUSES.includes(d.status)).length;
          const outstanding = engagementDocs.filter((d) => d.status === "required" || d.status === "requested");
          const timeline = (activities[e.id] ?? []).slice(0, 4);
          return (
            <div key={e.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{(e.rfp_id ? titles[e.rfp_id] : null) ?? e.manual_title ?? "Managed bid"}</p>
                  {e.manual_buyer && <p className="text-sm text-muted-foreground">{e.manual_buyer}</p>}
                </div>
                <div className="text-right">
                  <Badge>{STAGE_LABELS[e.stage]}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">since {format(new Date(e.stage_changed_at), "d MMM yyyy")}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Documents</p>
                  <p className="font-semibold">{collected} of {engagementDocs.length} in</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bid work prepared</p>
                  <p className="font-semibold">{work[e.id] ?? 0} item(s)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Closing date</p>
                  <p className="font-semibold">{e.manual_deadline ? format(new Date(e.manual_deadline), "d MMM yyyy") : "—"}</p>
                </div>
              </div>

              {outstanding.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Still needed from you</p>
                  {outstanding.map((d) => (
                    <p key={d.id} className="text-sm">
                      {d.name} <span className="text-muted-foreground">— {DOC_STATUS_LABELS[d.status]}{d.due_date ? `, by ${format(new Date(d.due_date), "d MMM")}` : ""}</span>
                    </p>
                  ))}
                </div>
              )}

              {engagementDocs.some((d) => d.storage_path) && (
                <div className="flex flex-wrap gap-2">
                  {engagementDocs.filter((d) => d.storage_path).map((d) => (
                    <Button key={d.id} size="sm" variant="outline" onClick={() => openDoc(d.storage_path!)}>
                      <FileText className="h-3.5 w-3.5 mr-1" /> {d.name}
                    </Button>
                  ))}
                </div>
              )}

              {timeline.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Recent progress</p>
                  {timeline.map((a) => (
                    <div key={a.id} className="border-l-2 border-border pl-3">
                      <p className="text-sm font-medium">
                        {ACTIVITY_TYPE_LABELS[a.activity_type] ?? titleCase(a.activity_type)}
                        <span className="text-xs text-muted-foreground font-normal"> · {format(new Date(a.activity_date), "d MMM yyyy")}</span>
                      </p>
                      {a.note && <p className="text-sm text-muted-foreground">{a.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ManagedEngagementPanel;
