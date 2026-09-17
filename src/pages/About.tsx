import { Handshake, Eye, Heart, Scale } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SEO from "@/components/SEO";

const values = [
  { icon: Eye, title: "Transparency", text: "Every step of our matching process is visible. Companies know exactly how and why they're paired with opportunities." },
  { icon: Handshake, title: "Partnership", text: "We're not just a listing service. We actively facilitate introductions, due diligence, and bid preparation." },
  { icon: Heart, title: "Community Impact", text: "By connecting local companies to contracts, we keep economic value within African communities." },
  { icon: Scale, title: "Ethical Practice", text: "No hidden fees, no conflicts of interest. Our subscription + success-fee model ensures aligned incentives." },
];

const About = () => {
  const valuesRef = useScrollReveal(120);

  return (
    <>
    <SEO title="About" path="/about" description="Learn about MiddlBrand's mission to connect vetted African businesses with real contract opportunities through ethical lead generation." />
    <section className="py-20 md:py-28 bg-background min-h-screen">
      <div className="container max-w-5xl">
        <div className="mb-20 max-w-3xl">
          <h1 className="text-[2.375rem] md:text-[3.25rem] leading-[1.08] font-display font-semibold text-foreground">
            About MiddlBrand
          </h1>
          <p className="mt-6 text-muted-foreground text-lg md:text-xl font-body leading-relaxed max-w-2xl">
MiddlBrand was born from a simple observation: qualified African companies consistently miss
            business opportunities — not due to lack of capability, but lack of access. We bridge that gap.
          </p>
        </div>

        <div className="space-y-8 mb-28 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground">How We Match & Facilitate</h2>
          <div className="border-y border-border py-8 space-y-6 text-muted-foreground font-body text-base leading-relaxed">
            <p><strong className="text-foreground font-display">1. Source</strong> — Our team monitors government portals, development agencies, and private sector procurement across Africa to identify tenders, RFPs and contracts.</p>
            <p><strong className="text-foreground font-display">2. Match</strong> — We analyze each opportunity against our directory of companies, considering expertise, location, capacity, and track record. Companies that submit registration and tax documents for manual review carry a verified badge.</p>
            <p><strong className="text-foreground font-display">3. Notify</strong> — Matched companies receive curated alerts with full tender details, requirements, and our guidance on submission best practices.</p>
            <p><strong className="text-foreground font-display">4. Facilitate</strong> — We support bid preparation, provide market intelligence, and make direct introductions where appropriate.</p>
            <p><strong className="text-foreground font-display">5. Commission</strong> — Start with a free plan to browse opportunities. Upgrade to Pro for AI-powered matching and bidding tools. A 3.5% success fee applies when you win.</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground mb-12">Our Values</h2>
          <div ref={valuesRef} className="grid sm:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="reveal rounded-lg border border-border bg-card p-8 hover:border-foreground/20 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <v.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground font-body">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default About;
