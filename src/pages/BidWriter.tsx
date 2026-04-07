import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";
import { useToast } from "@/hooks/use-toast";

const SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "company_background", label: "Company Background" },
  { key: "technical_approach", label: "Technical Approach" },
  { key: "team_and_personnel", label: "Team & Personnel" },
  { key: "relevant_experience", label: "Relevant Experience" },
  { key: "compliance_statement", label: "Compliance Statement" },
] as const;

const BidWriter = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [rfpText, setRfpText] = useState((location.state as any)?.rfpText || "");
  const [companyName, setCompanyName] = useState("");
  const [years, setYears] = useState("");
  const [employees, setEmployees] = useState("");
  const [pastProjects, setPastProjects] = useState("");
  const [certifications, setCertifications] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load profile company name
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("company_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.company_name) setCompanyName(data.company_name); });
  }, [user]);

  // Auto-save every 30s
  useEffect(() => {
    if (!user || Object.keys(sections).length === 0) return;
    autoSaveRef.current = setInterval(async () => {
      const payload = {
        user_id: user.id,
        rfp_title: rfpText.substring(0, 100),
        company_intake: { companyName, years, employees, pastProjects, certifications, advantage, teamMembers },
        generated_sections: sections,
        status: "draft" as const,
      };
      if (draftId) {
        await supabase.from("bid_drafts").update(payload).eq("id", draftId);
      } else {
        const { data } = await supabase.from("bid_drafts").insert(payload).select("id").single();
        if (data) setDraftId(data.id);
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [user, sections, draftId, companyName, years, employees, pastProjects, certifications, advantage, teamMembers, rfpText]);

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={true} onOpenChange={() => {}} feature="Bid Writer" />
        <div className="container py-16 text-center"><p className="text-muted-foreground">This is a Pro feature.</p></div>
      </>
    );
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    const companyInfo = JSON.stringify({ companyName, years, employees, pastProjects, certifications, advantage, teamMembers });

    // TODO: Switch to Claude claude-opus-4-5 when ANTHROPIC_API_KEY is added
    const { data, error: fnError } = await supabase.functions.invoke("bid-studio-ai", {
      body: { tool: "writer", variables: { rfp_text: rfpText, company_info: companyInfo } },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError(data?.error || "Our AI assistant is busy right now — please try again in a moment.");
    } else {
      setSections(data.result);
    }
  };

  const copySection = (key: string) => {
    navigator.clipboard.writeText(sections[key] || "");
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    const all = SECTIONS.map(s => `## ${s.label}\n\n${sections[s.key] || ""}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(all);
    toast({ title: "All sections copied" });
  };

  const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="container py-12 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold">✍️ Bid Writer</h1>
        <p className="text-muted-foreground mt-1">Generate professional bid sections powered by AI</p>
      </div>

      {Object.keys(sections).length === 0 ? (
        <>
          {step === 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step 1: RFP Source</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste the full RFP text here..."
                  className="min-h-[200px]"
                  value={rfpText}
                  onChange={(e) => setRfpText(e.target.value)}
                />
                <Button onClick={() => setStep(2)} disabled={!rfpText.trim()}>
                  Continue to Company Details <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step 2: Company Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Years in Operation</Label>
                    <Select value={years} onValueChange={setYears}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Less than 1", "1-3", "3-5", "5-10", "More than 10"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Employees</Label>
                    <Select value={employees} onValueChange={setEmployees}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["1-5", "6-20", "21-50", "51-200", "200+"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Relevant Past Projects</Label>
                  <Textarea placeholder="Describe up to 3 past projects relevant to this bid. Include project name, client, value, and outcome." value={pastProjects} onChange={(e) => setPastProjects(e.target.value)} />
                </div>
                <div>
                  <Label>Certifications & Registrations</Label>
                  <Textarea placeholder="List your certifications and registrations" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
                </div>
                <div>
                  <Label>Key Competitive Advantage</Label>
                  <Textarea placeholder="What makes your company the best fit for this bid?" value={advantage} onChange={(e) => setAdvantage(e.target.value)} />
                </div>
                <div>
                  <Label>Proposed Team Members & Roles</Label>
                  <Textarea placeholder="List team members and their roles" value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleGenerate} disabled={loading}>
                    {loading ? "Writing your bid sections — this takes about 30 seconds..." : "Generate Bid Sections"}
                  </Button>
                </div>
                {loading && (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full animate-pulse" />
                    <Skeleton className="h-4 w-3/4 animate-pulse" />
                  </div>
                )}
                {error && (
                  <div className="text-center space-y-2">
                    <p className="text-destructive text-sm">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleGenerate}>Try Again</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copyAll}><Copy className="h-3.5 w-3.5 mr-1" /> Copy All Sections</Button>
          </div>
          {SECTIONS.map(({ key, label }) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{wordCount(sections[key] || "")} words</span>
                  <Button variant="ghost" size="sm" onClick={() => copySection(key)}>
                    {copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[150px]"
                  value={sections[key] || ""}
                  onChange={(e) => setSections(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </CardContent>
            </Card>
          ))}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => { setSections({}); setStep(1); }}>Start Over</Button>
            <Button asChild>
              <Link to="/bid-studio/reviewer" state={{ rfpText, bidDraft: SECTIONS.map(s => `## ${s.label}\n\n${sections[s.key] || ""}`).join("\n\n") }}>
                Review My Bid <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidWriter;
