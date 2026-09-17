import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Target, Shield, TrendingUp, Users, Zap } from "lucide-react";
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
  const howHeadingRef = useScrollReveal();
  const dataHeadingRef = useScrollReveal();
  const dataGridRef = useScrollReveal(120);

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
      <section className="relative flex min-h-[calc(100svh-3.5rem)] items-center justify-center border-b border-border bg-background">
        <div className="container relative z-10 flex flex-col items-center text-center py-16">
          <p className="text-xs font-data font-medium uppercase tracking-[0.06em] text-muted-foreground animate-fade-in">
            African procurement intelligence
          </p>
          <h1 className="mt-6 text-[3rem] sm:text-6xl lg:text-[5.5rem] font-display font-semibold text-foreground leading-[0.98] animate-fade-in max-w-4xl">
            Find the tender. Build the bid. Win the work.
          </h1>
          <p
            className="mt-6 text-lg md:text-xl leading-relaxed text-muted-foreground font-body max-w-[640px] animate-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            Live public tenders from across Africa, with the bid tools to answer them.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <Button asChild size="lg" className="px-7">
              <Link to="/rfps">
                Browse Opportunities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-foreground/20 text-foreground">
              <Link to="/join">Register Your Company</Link>
            </Button>
          </div>
        </div>

        {/* Cue that content continues below the fold */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-[10px] font-data uppercase tracking-[0.08em]">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        </div>
      </section>

      {stats.length > 0 && (
        <section ref={statsRef} className="border-b border-border bg-card">
          <div className={`container grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-border ${stats.length === 4 ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3"}`}>
            {stats.map((s) => (
              <div key={s.label} className="py-9 text-left sm:text-center group cursor-default">
                <AnimatedCounter
                  value={s.value}
                  className="text-3xl md:text-4xl font-data font-medium text-foreground"
                />
                <p className="mt-2 text-xs font-body font-semibold text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bento Grid Services */}
      <section className="py-20 md:py-36 bg-background">
        <div className="container">
          <div ref={howHeadingRef} className="max-w-2xl mb-14 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
              How It Works
            </h2>
            <p className="mt-5 text-muted-foreground font-body text-lg leading-relaxed">
              We bridge the gap between qualified African businesses and the contracts they deserve.
            </p>
          </div>

          <div ref={bentoRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl">
            {/* Large card — Lead Generation */}
            <div className="reveal sm:col-span-2 md:col-span-2 md:row-span-2 rounded-lg border border-border bg-card p-8 md:p-10 flex flex-col justify-between min-h-[280px] md:min-h-[340px] group hover:border-foreground/20 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-2xl font-display font-bold text-foreground mb-3">Lead Generation</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-md">
                  We source tenders, RFPs and contracts that match your company's expertise — so you never miss an opportunity across Africa.
                </p>
              </div>
              
            </div>

            {/* Small card — Vetted */}
            <div className="reveal rounded-lg border border-border bg-card p-8 group hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Verified Companies</h3>
              <p className="text-xs text-muted-foreground font-body">
                Companies submit registration and tax documents, and our team reviews each one by hand before the
                verified badge is granted.
              </p>
            </div>

            {/* Small card — Subscription */}
            <div className="reveal rounded-lg border border-border bg-card p-8 group hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Pro Subscription</h3>
              <p className="text-xs text-muted-foreground font-body">
                $40/mo for AI matching, bid tools, and daily alerts. 3.5% success fee when you win.
              </p>
            </div>

            {/* Wide card — Ethical Matching */}
            <div className="reveal sm:col-span-2 md:col-span-2 rounded-lg border border-border bg-card p-8 flex items-center gap-4 sm:gap-6 group hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-1">Ethical Matching</h3>
                <p className="text-xs text-muted-foreground font-body">
                  Transparent pairing based on expertise, location, and capacity. No hidden agendas.
                </p>
              </div>
            </div>

            {/* Small card — Speed */}
            <div className="reveal rounded-lg border border-border bg-secondary/50 p-8 flex flex-col items-center justify-center text-center group hover:border-foreground/20 transition-colors">
              <Zap className="h-8 w-8 text-foreground mb-3" aria-hidden="true" />
              <h3 className="text-lg font-display font-semibold text-foreground mb-1">Fast Turnaround</h3>
              <p className="text-xs text-muted-foreground font-body">Matched to opportunities within 48 hours.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-36 bg-card border-y border-border">
        <div className="container">
          <div ref={dataHeadingRef} className="max-w-2xl mb-14 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
              Built Around Verifiable Data
            </h2>
            <p className="mt-5 text-muted-foreground font-body text-lg leading-relaxed">
              Every listing, company badge, and bid workspace is tied to source material or reviewed documentation.
            </p>
          </div>

          <div ref={dataGridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl">
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
              <div key={item.title} className="reveal rounded-lg border border-border bg-background p-8 hover:border-foreground/20 transition-colors">
                <h3 className="font-display font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-20 md:py-32 bg-foreground">
        <div className="container reveal">
          <h2 className="text-4xl md:text-6xl font-display font-semibold text-background max-w-3xl">
            Ready to Win More Contracts?
          </h2>
          <p className="mt-6 text-background/60 font-body text-lg leading-relaxed max-w-2xl">
            Create a company profile, browse live opportunities, and use Pro tools when you're ready to bid.
          </p>
          <div className="mt-9 flex">
            <Button asChild size="lg" className="group px-7">
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
