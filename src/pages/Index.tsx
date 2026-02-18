import { Link } from "react-router-dom";
import { ArrowRight, Target, Shield, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const stats = [
  { value: "500+", label: "Vetted Companies" },
  { value: "$12M+", label: "Matched" },
  { value: "3%", label: "Commission" },
  { value: "8", label: "Countries" },
];

const Index = () => {
  const statsRef = useScrollReveal(80);
  const bentoRef = useScrollReveal(120);
  const ctaRef = useScrollReveal();

  return (
    <>
      {/* Hero — typography-led with grain mesh */}
      <section className="relative min-h-screen flex items-center justify-center grain-mesh">
        <div className="container relative z-10 text-center py-20">
          <div className="max-w-4xl mx-auto">
            <h1
              className="text-7xl sm:text-8xl md:text-9xl font-display font-black text-foreground leading-[0.9] animate-fade-in"
            >
              MiddlBrand
            </h1>
            <p className="mt-8 text-base md:text-lg text-muted-foreground font-body max-w-xl mx-auto animate-fade-in"
               style={{ animationDelay: "200ms" }}>
              Connecting vetted West African businesses to real opportunities.
              No upfront fees. No risk. We earn 3% when you win.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <Button asChild size="lg" className="group rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 transition-all duration-300">
                <Link to="/rfps">
                  Browse Opportunities
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-foreground/20 text-foreground hover:border-accent hover:text-accent transition-all duration-300">
                <Link to="/join">Register Your Company</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="border-y border-border bg-card">
        <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {stats.map((s) => (
            <div key={s.label} className="reveal py-10 text-center group cursor-default">
              <p className="text-3xl md:text-4xl font-display font-bold text-foreground transition-colors duration-300 group-hover:text-accent">
                {s.value}
              </p>
              <p className="mt-1 text-xs font-body text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid Services */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-muted-foreground font-body text-sm">
              We bridge the gap between qualified West African businesses and the contracts they deserve.
            </p>
          </div>

          <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* Large card — Lead Generation */}
            <div className="reveal md:col-span-2 md:row-span-2 rounded-2xl border border-border bg-card p-8 md:p-10 flex flex-col justify-between min-h-[320px] group hover:border-accent/30 transition-colors duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-3">Lead Generation</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-md">
                  We source tenders, RFPs and contracts that match your company's expertise — so you never miss an opportunity across West Africa.
                </p>
              </div>
              {/* Abstract decorative element */}
              <div className="mt-8 h-20 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10" />
            </div>

            {/* Small card — Vetted */}
            <div className="reveal rounded-2xl border border-border bg-card p-6 group hover:border-accent/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Vetted Companies</h3>
              <p className="text-xs text-muted-foreground font-body">
                Every company is verified for capability, track record, and compliance.
              </p>
            </div>

            {/* Small card — Commission */}
            <div className="reveal rounded-2xl border border-border bg-card p-6 group hover:border-accent/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">3% Commission</h3>
              <p className="text-xs text-muted-foreground font-body">
                We only earn when you win. Incentives perfectly aligned.
              </p>
            </div>

            {/* Wide card — Ethical Matching */}
            <div className="reveal md:col-span-2 rounded-2xl border border-border bg-card p-6 flex items-center gap-6 group hover:border-accent/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-1">Ethical Matching</h3>
                <p className="text-xs text-muted-foreground font-body">
                  Transparent pairing based on expertise, location, and capacity. No hidden agendas.
                </p>
              </div>
            </div>

            {/* Small card — decorative / abstract */}
            <div className="reveal rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-transparent to-accent/10 p-6 flex items-center justify-center">
              <Zap className="h-8 w-8 text-accent/30" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 bg-primary grain-mesh">
        <div className="container text-center reveal">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">
            Ready to Win More Contracts?
          </h2>
          <p className="mt-4 text-primary-foreground/60 font-body text-sm max-w-lg mx-auto">
            Join hundreds of West African companies growing through MiddlBrand's opportunity matching platform.
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Button asChild size="lg" className="group rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 transition-all duration-300">
              <Link to="/join">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-primary-foreground/20 text-primary-foreground hover:border-accent hover:text-accent transition-all duration-300">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
