import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, AlertTriangle, Download, Sparkles } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import { SAMPLE_DOCUMENTS_LIST } from "@/lib/sampleRfp";
import { usePersistentState } from "@/hooks/usePersistentState";
import SaveStatusIndicator from "@/components/SaveStatusIndicator";

const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic",
  "Chad","Comoros","Congo","Côte d'Ivoire","DR Congo","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini",
  "Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar",
  "Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda",
  "São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan",
  "Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
];

interface ChecklistResult {
  timeline: { date: string; days_before_deadline: number; task: string; priority: string }[];
  document_checklist: { document: string; typical_processing_time: string; tips: string }[];
  submission_day_checklist: string[];
  common_mistakes: string[];
}

const STORAGE_KEY = "bid-checklist-checks";

const BidChecklist = () => {
  const { isPro } = useSubscription();
  const [deadlineIso, setDeadlineIso] = usePersistentState<string | null>("bid-checklist:deadline", null);
  const deadline = deadlineIso ? new Date(deadlineIso) : undefined;
  const setDeadline = (d: Date | undefined) => setDeadlineIso(d ? d.toISOString() : null);
  const [documents, setDocuments] = usePersistentState<string>("bid-checklist:documents", "");
  const [country, setCountry] = usePersistentState<string>("bid-checklist:country", "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChecklistResult | null>(null);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(checks)); }, [checks]);

  const toggleCheck = (key: string) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={true} onOpenChange={() => {}} feature="Submission Checklist" />
        <div className="container py-16 text-center"><p className="text-muted-foreground">This is a Pro feature.</p></div>
      </>
    );
  }

  const handleGenerate = async () => {
    if (!deadline || !documents.trim() || !country) return;
    setLoading(true);
    setError("");
    setResult(null);

    // TODO: Switch to Claude claude-opus-4-5 when ANTHROPIC_API_KEY is added
    const { data, error: fnError } = await supabase.functions.invoke("bid-studio-ai", {
      body: {
        tool: "checklist",
        variables: {
          today_date: format(new Date(), "yyyy-MM-dd"),
          deadline: format(deadline, "yyyy-MM-dd"),
          documents,
          country,
        },
      },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError(data?.error || "Our AI assistant is busy right now — please try again in a moment.");
    } else {
      setResult(data.result);
    }
  };

  const priorityColor = (p: string) => {
    if (p === "critical") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (p === "important") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  return (
    <div className="container py-12 space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">✅ Submission Checklist</h1>
          <p className="text-muted-foreground mt-1">Never miss a deadline or document again</p>
        </div>
        <SaveStatusIndicator />
      </div>

      {!result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setDeadline(addDays(new Date(), 45));
                setDocuments(SAMPLE_DOCUMENTS_LIST);
                setCountry("Kenya");
                setError("");
              }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Load sample RFP
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">RFP Submission Deadline</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Required Documents from the RFP</label>
              <Textarea placeholder="Paste the list of required documents..." className="min-h-[120px]" value={documents} onChange={(e) => setDocuments(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Your Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                <SelectContent>
                  {AFRICAN_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!deadline || !documents.trim() || !country || loading} className="w-full">
              {loading ? "Building your submission plan..." : "Generate My Checklist"}
            </Button>
            {loading && <div className="space-y-3"><Skeleton className="h-4 w-full animate-pulse" /><Skeleton className="h-4 w-3/4 animate-pulse" /></div>}
            {error && <div className="text-center space-y-2"><p className="text-destructive text-sm">{error}</p><Button variant="outline" size="sm" onClick={handleGenerate}>Try Again</Button></div>}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Backwards Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.timeline?.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                  <Checkbox checked={!!checks[`tl-${i}`]} onCheckedChange={() => toggleCheck(`tl-${i}`)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{t.date}</span>
                      <Badge variant="secondary" className="text-xs">{t.days_before_deadline}d before</Badge>
                      <Badge className={cn("text-xs", priorityColor(t.priority))}>{t.priority}</Badge>
                    </div>
                    <p className="text-sm mt-1">{t.task}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Document Checklist */}
          <Card>
            <CardHeader><CardTitle className="text-base">Document Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.document_checklist?.map((d, i) => (
                <div key={i} className="p-3 rounded-md border space-y-1">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={!!checks[`doc-${i}`]} onCheckedChange={() => toggleCheck(`doc-${i}`)} />
                    <div>
                      <p className="text-sm font-medium">{d.document}</p>
                      <Badge variant="outline" className="text-xs mt-1">{d.typical_processing_time}</Badge>
                      <p className="text-xs text-muted-foreground mt-1 p-2 bg-muted/30 rounded">{d.tips}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submission Day */}
          <Card>
            <CardHeader><CardTitle className="text-base">Submission Day Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.submission_day_checklist?.map((task, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Checkbox checked={!!checks[`sub-${i}`]} onCheckedChange={() => toggleCheck(`sub-${i}`)} />
                  <label className="text-sm cursor-pointer">{i + 1}. {task}</label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Common Mistakes */}
          <Card className="border-amber-500/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Common Mistakes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.common_mistakes?.map((m, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  {m}
                </div>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => { setResult(null); setChecks({}); }}>Generate New Checklist</Button>
        </div>
      )}
    </div>
  );
};

export default BidChecklist;
