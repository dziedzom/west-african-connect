import { Link } from "react-router-dom";
import { ArrowRight, Target, Shield, TrendingUp, Users, Zap, Building2, Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import SEO from "@/components/SEO";

const stats = [
  { value: "500+", label: "Vetted Companies" },
  { value: "$12M+", label: "Matched" },
  { value: "5%", label: "Commission" },
  { value: "8", label: "Countries" },
];

const testimonials = [
  {
    quote: "MiddlBrand connected us to a $250K infrastructure contract we never would have found on our own. Their matching is incredibly precise.",
    name: "Kwame Asante",
    title: "CEO, Asante Construction",
    icon: Building2,
  },
  {
    quote: "The commission model means zero risk for us. We only pay when we win — and we've won three contracts in six months.",
    name: "Amina Diallo",
    title: "Director, Sahel Logistics",
    icon: Briefcase,
  },
  {
    quote: "Their vetting process gave us credibility with buyers we couldn't reach before. It's opened doors across West Africa.",
    name: "Emeka Okafor",
    title: "Founder, TechBridge Solutions",
    icon: Globe,
  },
];

const Index = () => {
  const statsRef = useScrollReveal(80);
  const bentoRef = useScrollReveal(120);
  const ctaRef = useScrollReveal();
  const testimonialsRef = useScrollReveal(100);

  return (
    <>
      <SEO
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MiddlBrand",
          url: "https://middlbrand.com",
          description: "Connecting vetted West African businesses to real opportunities through ethical lead generation.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://middlbrand.com/rfps?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {/* Hero — typography-led with grain mesh */}
      <section className="relative min-h-screen flex items-center justify-center grain-mesh">
        <div className="container relative z-10 text-center py-20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black text-foreground leading-[0.9] animate-fade-in">
              MiddlBrand
            </h1>
            <p className="mt-8 text-base md:text-lg text-muted-foreground font-body max-w-xl mx-auto animate-fade-in"
               style={{ animationDelay: "200ms" }}>
              Connecting vetted West African businesses to real opportunities.
              No upfront fees. No risk. We earn 5% when you win.
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

      {/* Stats with animated counters */}
      <section ref={statsRef} className="border-y border-border bg-card">
        <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:md:border-t-0">
          {stats.map((s) => (
            <div key={s.label} className="reveal py-10 text-center group cursor-default">
              <AnimatedCounter
                value={s.value}
                className="text-3xl md:text-4xl font-display font-bold text-foreground transition-colors duration-300 group-hover:text-accent"
              />
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

          <div ref={bentoRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* Large card — Lead Generation */}
            <div className="reveal sm:col-span-2 md:col-span-2 md:row-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 md:p-10 flex flex-col justify-between min-h-[280px] md:min-h-[320px] group hover:border-accent/30 transition-colors duration-300">
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-3">Lead Generation</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-md">
                  We source tenders, RFPs and contracts that match your company's expertise — so you never miss an opportunity across West Africa.
                </p>
              </div>
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
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">5–10% Commission</h3>
              <p className="text-xs text-muted-foreground font-body">
                We only earn when you win. Tiered from 5% to 10% based on service level.
              </p>
            </div>

            {/* Wide card — Ethical Matching */}
            <div className="reveal sm:col-span-2 md:col-span-2 rounded-2xl border border-border bg-card p-6 flex items-center gap-4 sm:gap-6 group hover:border-accent/30 transition-colors duration-300">
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

            {/* Small card — decorative */}
            <div className="reveal rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-transparent to-accent/10 p-6 flex items-center justify-center">
              <Zap className="h-8 w-8 text-accent/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Trusted by Leading Companies
            </h2>
            <p className="mt-4 text-muted-foreground font-body text-sm">
              Real results from businesses growing through MiddlBrand.
            </p>
          </div>

          <div ref={testimonialsRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <div key={t.name} className="reveal rounded-2xl border border-border bg-background p-8 flex flex-col justify-between hover:border-accent/30 transition-colors duration-300">
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-8">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <t.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-display font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-body">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
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
