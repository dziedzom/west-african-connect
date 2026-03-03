import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Upload, CheckCircle2, X } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SEO from "@/components/SEO";

// ── Formspree Configuration ──────────────────────────────────────────
// Paste your Formspree form ID below (e.g. "xyzabcde")
const FORMSPREE_ID = ""; // <-- Replace with your Formspree ID
// Endpoint: https://formspree.io/f/${FORMSPREE_ID}
// ─────────────────────────────────────────────────────────────────────

const STEPS = ["Company Profile", "Expertise", "Tender & Credentials"];

const techDigital = [
  "Web & App Development (React, Mobile Native, AI Integration)",
  "UI/UX Design",
  "Software Engineering",
];

const marketingCreative = [
  "Media Buying & Planning",
  "Strategy",
  "Content Storytelling",
  "Social Media Management",
  "SEO",
];

const productionBTL = [
  "Below-the-Line (BTL) Activations",
  "Large Scale Printing",
  "Event Production",
  "Signage",
];

const Partnerships = () => {
  const revealRef = useScrollReveal();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    website: "",
    years_in_operation: "",
    tech_digital: [] as string[],
    marketing_creative: [] as string[],
    production_btl: [] as string[],
    primary_interest: "",
  });

  const toggleCheck = (field: "tech_digital" | "marketing_creative" | "production_btl", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }));
  };

  const canAdvance = () => {
    if (step === 0) return form.company_name.trim().length > 0;
    if (step === 1) return [...form.tech_digital, ...form.marketing_creative, ...form.production_btl].length > 0;
    if (step === 2) return form.primary_interest.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!FORMSPREE_ID) {
      console.warn("FORMSPREE_ID is not configured. Simulating submission.");
      setSubmitting(true);
      setTimeout(() => {
        setSubmitting(false);
        setSuccess(true);
      }, 1200);
      return;
    }

    setSubmitting(true);
    const body = new FormData();
    body.append("company_name", form.company_name);
    body.append("website", form.website);
    body.append("years_in_operation", form.years_in_operation);
    body.append("tech_digital", form.tech_digital.join(", "));
    body.append("marketing_creative", form.marketing_creative.join(", "));
    body.append("production_btl", form.production_btl.join(", "));
    body.append("primary_interest", form.primary_interest);
    if (fileRef.current?.files?.[0]) {
      body.append("capability_statement", fileRef.current.files[0]);
    }

    try {
      await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, { method: "POST", body });
      setSuccess(true);
    } catch {
      console.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <SEO title="Partnerships" path="/partnerships" description="Apply for partnership opportunities with MiddlBrand. Submit your company profile and credentials to access premium contracts." />
    <div ref={revealRef} className="relative min-h-screen">
      {/* Hero */}
      <section className="grain-mesh py-32 md:py-44">
        <div className="container max-w-4xl reveal">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">Partnerships</p>
          <h1 className="font-display text-5xl md:text-7xl font-black leading-[0.95] mb-6">
            Scale Through<br />Collaboration.
          </h1>
          <p className="font-body text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            MiddlBrand's internal agency invites strategic partners for Joint Venture opportunities on global Tenders, RFPs, and RFQs.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 md:py-32">
        <div className="container max-w-2xl">
          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-12 reveal">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 font-body text-xs transition-colors ${
                    i === step
                      ? "text-foreground font-semibold"
                      : i < step
                      ? "text-accent cursor-pointer"
                      : "text-muted-foreground/40"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border transition-colors ${
                      i === step
                        ? "border-foreground text-foreground"
                        : i < step
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-muted-foreground/40"
                    }`}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 0: Company Profile */}
          {step === 0 && (
            <div className="space-y-8 reveal">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Company Profile</h2>
                <p className="font-body text-sm text-muted-foreground">Tell us about your organisation.</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Company Name *</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Acme Corp"
                    className="h-12 font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://acmecorp.com"
                    className="h-12 font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Years in Operation</Label>
                  <Input
                    value={form.years_in_operation}
                    onChange={(e) => setForm({ ...form, years_in_operation: e.target.value })}
                    placeholder="e.g. 5"
                    className="h-12 font-body"
                    type="number"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Expertise */}
          {step === 1 && (
            <div className="space-y-10 reveal">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Areas of Expertise</h2>
                <p className="font-body text-sm text-muted-foreground">Select all that apply across your capabilities.</p>
              </div>

              {/* Tech & Digital */}
              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Technical & Digital</h3>
                <div className="space-y-3">
                  {techDigital.map((item) => (
                    <label key={item} className="flex items-start gap-3 cursor-pointer group">
                      <Checkbox
                        checked={form.tech_digital.includes(item)}
                        onCheckedChange={() => toggleCheck("tech_digital", item)}
                        className="mt-0.5"
                      />
                      <span className="font-body text-sm text-foreground group-hover:text-accent transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Marketing & Creative */}
              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Marketing & Creative</h3>
                <div className="space-y-3">
                  {marketingCreative.map((item) => (
                    <label key={item} className="flex items-start gap-3 cursor-pointer group">
                      <Checkbox
                        checked={form.marketing_creative.includes(item)}
                        onCheckedChange={() => toggleCheck("marketing_creative", item)}
                        className="mt-0.5"
                      />
                      <span className="font-body text-sm text-foreground group-hover:text-accent transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Production & BTL */}
              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Production & BTL</h3>
                <div className="space-y-3">
                  {productionBTL.map((item) => (
                    <label key={item} className="flex items-start gap-3 cursor-pointer group">
                      <Checkbox
                        checked={form.production_btl.includes(item)}
                        onCheckedChange={() => toggleCheck("production_btl", item)}
                        className="mt-0.5"
                      />
                      <span className="font-body text-sm text-foreground group-hover:text-accent transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tender & Credentials */}
          {step === 2 && (
            <div className="space-y-8 reveal">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Tender Specifics & Credentials</h2>
                <p className="font-body text-sm text-muted-foreground">Tell us how you'd like to collaborate.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Primary Interest *</Label>
                  <Select value={form.primary_interest} onValueChange={(v) => setForm({ ...form, primary_interest: v })}>
                    <SelectTrigger className="h-12 font-body">
                      <SelectValue placeholder="Select collaboration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="joint_venture">Joint Venture</SelectItem>
                      <SelectItem value="sub_contracting">Sub-contracting</SelectItem>
                      <SelectItem value="resource_sharing">Resource Sharing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground">Capability Statement / Company Profile</Label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-4 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <p className="font-body text-sm text-foreground">
                        {fileName || "Click to upload"}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">PDF, DOC, PPTX up to 10MB</p>
                    </div>
                    {fileName && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileName("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12 reveal">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="font-body text-sm gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-sm gap-2 px-6"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canAdvance() || submitting}
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-sm gap-2 px-6"
              >
                {submitting ? "Submitting…" : "Submit Application"} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
          <div className="text-center max-w-md px-6 reveal visible">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h2 className="font-display text-3xl font-bold mb-4">Partnership Application Received</h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
              Our team will review your credentials against upcoming tender requirements. We'll be in touch.
            </p>
            <Button
              onClick={() => {
                setSuccess(false);
                setStep(0);
                setForm({ company_name: "", website: "", years_in_operation: "", tech_digital: [], marketing_creative: [], production_btl: [], primary_interest: "" });
                setFileName("");
              }}
              variant="outline"
              className="rounded-full font-body text-sm"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partnerships;
