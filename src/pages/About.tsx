import { Handshake, Eye, Heart, Scale } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SEO from "@/components/SEO";

const values = [
  { icon: Eye, title: "Transparency", text: "Every step of our matching process is visible. Companies know exactly how and why they're paired with opportunities." },
  { icon: Handshake, title: "Partnership", text: "We're not just a listing service. We actively facilitate introductions, due diligence, and bid preparation." },
  { icon: Heart, title: "Community Impact", text: "By connecting local companies to contracts, we keep economic value within African communities." },
  { icon: Scale, title: "Ethical Practice", text: "No hidden fees, no conflicts of interest. Our 5–10% tiered commission model ensures aligned incentives." },
];

const About = () => {
  const valuesRef = useScrollReveal(120);

  return (
    <>
    <SEO title="About" path="/about" description="Learn about MiddlBrand's mission to connect vetted African businesses with real contract opportunities through ethical lead generation." />
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-3xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            About MiddlBrand
          </h1>
          <p className="mt-4 text-muted-foreground text-sm font-body leading-relaxed">
MiddlBrand was born from a simple observation: qualified African companies consistently miss
            business opportunities — not due to lack of capability, but lack of access. We bridge that gap.
          </p>
        </div>

        <div className="space-y-6 mb-16">
          <h2 className="text-2xl font-display font-bold text-foreground">How We Match & Facilitate</h2>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-muted-foreground font-body text-sm">
            <p><strong className="text-foreground font-display">1. Source</strong> — Our team monitors government portals, development agencies, and private sector procurement across Africa to identify tenders, RFPs and contracts.</p>
            <p><strong className="text-foreground font-display">2. Match</strong> — We analyze each opportunity against our directory of vetted companies, considering expertise, location, capacity, and track record.</p>
            <p><strong className="text-foreground font-display">3. Notify</strong> — Matched companies receive curated alerts with full tender details, requirements, and our guidance on submission best practices.</p>
            <p><strong className="text-foreground font-display">4. Facilitate</strong> — We support bid preparation, provide market intelligence, and make direct introductions where appropriate.</p>
            <p><strong className="text-foreground font-display">5. Commission</strong> — Only when a company wins a contract through our platform do we charge a success fee. No upfront costs ever.</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-8">Our Values</h2>
          <div ref={valuesRef} className="grid sm:grid-cols-2 gap-4">
            {values.map((v) => (
              <div key={v.title} className="reveal rounded-2xl border border-border bg-card p-6 hover:border-accent/30 transition-colors duration-300">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <v.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-xs text-muted-foreground font-body">{v.text}</p>
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
