import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Target, Shield, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import AnimatedCounter from "@/components/AnimatedCounter";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

type HomepageLiveStats = {
  live_opportunities: number;
  total_recorded_value: number;
  opportunities_with_recorded_value: number;
  active_sources: number;
  countries_represented: number;
};

const formatRecordedValue = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
};

const Index = () => {
  const [liveStats, setLiveStats] = useState<HomepageLiveStats | null>(null);
  const statsRef = useScrollReveal(80);
  const bentoRef = useScrollReveal(120);
  const ctaRef = useScrollReveal();

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      const { data, error } = await supabase
        .from("homepage_live_stats")
        .select("live_opportunities,total_recorded_value,opportunities_with_recorded_value,active_sources,countries_represented")
        .eq("id", true)
        .maybeSingle();
      if (error || !mounted) return;
      if (data) setLiveStats(data);
    };

    loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    if (!liveStats) return [];

    return [
      liveStats.live_opportunities > 0
        ? { value: String(liveStats.live_opportunities), label: "Live Opportunities" }
        : null,
      liveStats.total_recorded_value > 0 && liveStats.opportunities_with_recorded_value > 0
        ? { value: formatRecordedValue(liveStats.total_recorded_value), label: "Recorded Tender Value" }
        : null,
      liveStats.active_sources > 0
        ? { value: String(liveStats.active_sources), label: "Active Sources" }
        : null,
      liveStats.countries_represented > 0
        ? { value: String(liveStats.countries_represented), label: "Countries Represented" }
        : null,
    ].filter((stat): stat is { value: string; label: string } => Boolean(stat));
  }, [liveStats]);

  return (
    <>
      <SEO
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MiddlBrand",
          url: "https://middlbrand.com",
          description: "Connecting vetted African businesses to real opportunities through ethical lead generation.",
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
              <span className="sr-only"> — Connecting African Businesses to Winning RFP Contracts</span>
            </h1>
            <p className="mt-8 text-base md:text-lg text-muted-foreground font-body max-w-xl mx-auto animate-fade-in"
               style={{ animationDelay: "200ms" }}>
              Connecting vetted African businesses to real opportunities.
              Start free. Upgrade to Pro for AI-powered matching and bidding.
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

      {stats.length > 0 && (
        <section ref={statsRef} className="border-y border-border bg-card">
          <div className={`container grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-border ${stats.length === 4 ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3"}`}>
            {stats.map((s) => (
              <div key={s.label} className="py-10 text-center group cursor-default">
                <AnimatedCounter
                  value={s.value}
                  className="text-3xl md:text-4xl font-display font-bold text-foreground transition-colors duration-300 group-hover:text-accent"
                />
                <p className="mt-1 text-xs font-body text-muted-foreground uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bento Grid Services */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-muted-foreground font-body text-sm">
              We bridge the gap between qualified African businesses and the contracts they deserve.
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
                  We source tenders, RFPs and contracts that match your company's expertise — so you never miss an opportunity across Africa.
                </p>
              </div>
              <div className="mt-8 h-20 rounded-xl bg-gradient-to-r from-accent/5 to-accent/10" />
            </div>

            {/* Small card — Vetted */}
            <div className="reveal rounded-2xl border border-border bg-card p-6 group hover:border-accent/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Verified Companies</h3>
              <p className="text-xs text-muted-foreground font-body">
                Companies submit registration and tax documents, and our team reviews each one by hand before the
                verified badge is granted.
              </p>
            </div>

            {/* Small card — Subscription */}
            <div className="reveal rounded-2xl border border-border bg-card p-6 group hover:border-accent/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Pro Subscription</h3>
              <p className="text-xs text-muted-foreground font-body">
                $40/mo for AI matching, bid tools, and daily alerts. 3.5% success fee when you win.
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

            {/* Small card — Speed */}
            <div className="reveal rounded-2xl border border-border bg-gradient-to-br from-accent/5 via-transparent to-accent/10 p-6 flex flex-col items-center justify-center text-center group hover:border-accent/30 transition-colors duration-300">
              <Zap className="h-8 w-8 text-accent/40 mb-3 group-hover:text-accent transition-colors duration-300" />
              <h3 className="text-lg font-display font-semibold text-foreground mb-1">Fast Turnaround</h3>
              <p className="text-xs text-muted-foreground font-body">Matched to opportunities within 48 hours.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card border-y border-border">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Built Around Verifiable Data
            </h2>
            <p className="mt-4 text-muted-foreground font-body text-sm">
              Every listing, company badge, and bid workspace is tied to source material or reviewed documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              {
                title: "Source-linked listings",
                text: "Open opportunities keep their portal links, deadlines, locations, and tender details visible for review.",
              },
              {
                title: "Manual verification",
                text: "Verified badges are granted only after registration and tax documents are reviewed by the MiddlBrand team.",
              },
              {
                title: "Recorded outcomes",
                text: "Users can track submitted, won, lost, or undecided opportunities so performance data starts from real results.",
              },
            ].map((item) => (
              <div key={item.title} className="reveal rounded-2xl border border-border bg-background p-8 hover:border-accent/30 transition-colors duration-300">
                <h3 className="font-display font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-24 bg-foreground">
        <div className="container text-center reveal">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-background">
            Ready to Win More Contracts?
          </h2>
          <p className="mt-4 text-background/60 font-body text-sm max-w-lg mx-auto">
            Create a company profile, browse live opportunities, and use Pro tools when you're ready to bid.
          </p>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="group rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 transition-all duration-300">
              <Link to="/join">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
