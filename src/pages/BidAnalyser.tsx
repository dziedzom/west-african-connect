import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, CheckCircle2, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/UpgradeModal";

interface AnalysisResult {
  summary: string;
  contracting_authority: string;
  country: string;
  deadline: string;
  estimated_value: string | null;
  eligibility: { requirement: string; met: boolean | null }[];
  documents_required: string[];
  evaluation_criteria: { criterion: string; weight: string | null }[];
  red_flags: string[];
  win_strategy: string;
}

const BidAnalyser = () => {
  const { isPro } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [rfpText, setRfpText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB.");
      return;
    }
    setError("");
    setPdfFile(file);
    extractTextFromPdf(file);
  }, [extractTextFromPdf]);

  const extractTextFromPdf = useCallback(async (file: File) => {
    setPdfExtracting(true);
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n\n";
      }
      setRfpText(text.trim());
    } catch {
      setError("Failed to extract text from PDF. Please try pasting the text instead.");
    } finally {
      setPdfExtracting(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB.");
      return;
    }
    setError("");
    setPdfFile(file);
    extractTextFromPdf(file);
  }, [extractTextFromPdf]);

  if (!isPro) {
    return (
      <>
        <UpgradeModal open={!isPro} onOpenChange={setShowUpgrade} feature="RFP Analyser" />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">This is a Pro feature.</p>
          <Button onClick={() => setShowUpgrade(true)} className="mt-4">Upgrade to Pro</Button>
        </div>
      </>
    );
  }

  const handleAnalyse = async () => {
    if (!rfpText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    // TODO: Switch to Claude claude-opus-4-5 when ANTHROPIC_API_KEY is added
    const { data, error: fnError } = await supabase.functions.invoke("bid-studio-ai", {
      body: { tool: "analyser", variables: { rfp_text: rfpText } },
    });

    setLoading(false);
    if (fnError || data?.error) {
      setError(data?.error || "Our AI assistant is busy right now — please try again in a moment.");
    } else {
      setResult(data.result);
    }
  };

  return (
    <div className="container py-12 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold">🔍 RFP Analyser</h1>
        <p className="text-muted-foreground mt-1">Paste an RFP and get a structured intelligence brief in seconds</p>
      </div>

      {!result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Paste RFP Text</TabsTrigger>
                <TabsTrigger value="upload">Upload PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="paste">
                <Textarea
                  placeholder="Paste the full RFP or tender document text here..."
                  className="min-h-[250px] mt-4"
                  value={rfpText}
                  onChange={(e) => setRfpText(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="upload">
                <div className="mt-4 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!pdfFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
                    >
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Click to upload a PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 20MB</p>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pdfExtracting ? "Extracting text..." : `${(pdfFile.size / 1024).toFixed(0)} KB — text extracted`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setPdfFile(null); setRfpText(""); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {rfpText && pdfFile && (
                    <Textarea
                      value={rfpText}
                      onChange={(e) => setRfpText(e.target.value)}
                      className="min-h-[150px]"
                      placeholder="Extracted text will appear here..."
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleAnalyse} disabled={!rfpText.trim() || loading} className="w-full">
              {loading ? "Analysing your RFP..." : "Analyse RFP"}
            </Button>
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full animate-pulse" />
                <Skeleton className="h-4 w-3/4 animate-pulse" />
                <Skeleton className="h-4 w-1/2 animate-pulse" />
              </div>
            )}
            {error && (
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={handleAnalyse}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{result.summary}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span><strong>Authority:</strong> {result.contracting_authority}</span>
                <span><strong>Country:</strong> {result.country}</span>
                <span><strong>Deadline:</strong> {result.deadline}</span>
                {result.estimated_value && <span><strong>Value:</strong> {result.estimated_value}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Eligibility */}
          <Card>
            <CardHeader><CardTitle className="text-base">Eligibility Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.eligibility?.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Checkbox id={`elig-${i}`} />
                  <label htmlFor={`elig-${i}`} className="text-sm cursor-pointer">{item.requirement}</label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader><CardTitle className="text-base">Documents Required</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.documents_required?.map((doc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Checkbox id={`doc-${i}`} />
                  <label htmlFor={`doc-${i}`} className="text-sm cursor-pointer">{doc}</label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Evaluation Criteria */}
          <Card>
            <CardHeader><CardTitle className="text-base">Evaluation Criteria</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-2 font-medium">Criterion</th><th className="text-left p-2 font-medium">Weight</th></tr>
                  </thead>
                  <tbody>
                    {result.evaluation_criteria?.map((ec, i) => (
                      <tr key={i} className="border-t"><td className="p-2">{ec.criterion}</td><td className="p-2">{ec.weight || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Red Flags */}
          {result.red_flags?.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Red Flags</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.red_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {flag}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Win Strategy */}
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Win Strategy</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{result.win_strategy}</p></CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => { setResult(null); setRfpText(""); setPdfFile(null); }}>Analyse Another</Button>
            <Button asChild>
              <Link to="/bid-studio/writer" state={{ rfpText }}>Start Bid Writer <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidAnalyser;
