import { Check, Minus } from "lucide-react";

type Cell = boolean | string;

interface Row {
  feature: string;
  free: Cell;
  pro: Cell;
}

interface Section {
  title: string;
  rows: Row[];
}

const sections: Section[] = [
  {
    title: "Tender Discovery",
    rows: [
      { feature: "Browse all live tenders across Africa", free: true, pro: true },
      { feature: "Basic search & category filters", free: true, pro: true },
      { feature: "Tender titles & summaries", free: true, pro: true },
      { feature: "Full tender detail pages with AI summary", free: false, pro: true },
      { feature: "Direct source links to procurement portals", free: "Limited", pro: "Unlimited" },
      { feature: "Deadline countdown chips on every card", free: true, pro: true },
    ],
  },
  {
    title: "AI Intelligence",
    rows: [
      { feature: "AI match score (0–100) on every tender", free: false, pro: true },
      { feature: "Go / Maybe / No-Go recommendation badges", free: false, pro: true },
      { feature: "Key requirements extraction", free: false, pro: true },
      { feature: "Risk flags & missing qualifications", free: false, pro: true },
      { feature: "Winning strategy summary", free: false, pro: true },
      { feature: "Gap analysis vs. your company profile", free: false, pro: true },
    ],
  },
  {
    title: "Bid Studio",
    rows: [
      { feature: "AI Bid Analyser", free: false, pro: true },
      { feature: "AI Bid Writer (full proposal drafting)", free: false, pro: true },
      { feature: "AI Bid Reviewer (scoring & critique)", free: false, pro: true },
      { feature: "Submission Checklist generator", free: false, pro: true },
    ],
  },
  {
    title: "Pipeline & Tracking",
    rows: [
      { feature: "Save tenders to shortlist", free: "Up to 5", pro: "Unlimited" },
      { feature: '"I\'m Bidding" pipeline tracker', free: false, pro: true },
      { feature: "Won contract reporting", free: false, pro: true },
      { feature: "Knowledge base (case studies, capabilities)", free: false, pro: true },
    ],
  },
  {
    title: "Alerts & Support",
    rows: [
      { feature: "Daily email digest of matched tenders", free: false, pro: true },
      { feature: "Priority email support", free: false, pro: "Annual only" },
      { feature: "Success-fee partnership (3.5%, capped $5k)", free: false, pro: true },
    ],
  },
];

const renderCell = (val: Cell, accent = false) => {
  if (val === true)
    return <Check className={`h-4 w-4 mx-auto ${accent ? "text-accent" : "text-foreground"}`} />;
  if (val === false) return <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" />;
  return (
    <span className={`text-xs font-body ${accent ? "text-accent font-semibold" : "text-foreground"}`}>
      {val}
    </span>
  );
};

const PricingComparisonTable = () => {
  return (
    <div className="max-w-4xl mx-auto mb-24">
      <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
        Compare plans, feature by feature
      </h2>
      <p className="text-center text-xs text-muted-foreground font-body mb-10">
        Everything that's included on Free vs. Pro.
      </p>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] bg-muted/30 border-b border-border">
          <div className="px-5 py-4 text-[10px] font-body uppercase tracking-widest text-muted-foreground">
            Feature
          </div>
          <div className="px-3 py-4 text-center text-xs font-display font-semibold text-foreground border-l border-border">
            Free
          </div>
          <div className="px-3 py-4 text-center text-xs font-display font-semibold text-accent border-l border-border bg-accent/5">
            Pro
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-5 py-2.5 bg-muted/15 border-b border-border">
              <p className="text-[10px] font-display font-bold uppercase tracking-widest text-foreground">
                {section.title}
              </p>
            </div>
            {section.rows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center ${
                  i !== section.rows.length - 1 ? "border-b border-border/50" : "border-b border-border"
                }`}
              >
                <div className="px-5 py-3 text-xs font-body text-foreground">{row.feature}</div>
                <div className="px-3 py-3 text-center border-l border-border">
                  {renderCell(row.free)}
                </div>
                <div className="px-3 py-3 text-center border-l border-border bg-accent/5">
                  {renderCell(row.pro, true)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingComparisonTable;
