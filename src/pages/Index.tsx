import { Link } from "react-router-dom";
import { ArrowRight, Target, Shield, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { value: "500+", label: "Vetted Companies" },
  { value: "$12M+", label: "Opportunities Matched" },
  { value: "3%", label: "Success Commission" },
  { value: "8", label: "West African Countries" },
];

const features = [
  {
    icon: Target,
    title: "Lead Generation",
    description: "We source tenders, RFPs and contracts that match your company's expertise — so you never miss an opportunity.",
  },
  {
    icon: Shield,
    title: "Vetted Companies",
    description: "Every company in our directory is verified for capability, track record, and compliance standards.",
  },
  {
    icon: TrendingUp,
    title: "3% Commission Model",
    description: "We only earn when you win. Our success-based model means our incentives are perfectly aligned with yours.",
  },
  {
    icon: Users,
    title: "Ethical Matching",
    description: "Transparent pairing of companies to opportunities based on expertise, location, and capacity.",
  },
];

const Index = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/60" />
        <div className="container relative z-10 py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight">
              Connecting West African Businesses to Real Opportunities.
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/80 max-w-xl">
              We connect vetted companies to missed opportunities and earn 3% commission on wins. No upfront fees. No risk.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark font-semibold px-8">
                <Link to="/rfps">Browse Opportunities <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/join">Register Your Company</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
        <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {stats.map((s) => (
            <div key={s.label} className="py-8 text-center">
              <p className="text-3xl font-display font-bold text-accent">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              How MiddleBrand Works
            </h2>
            <p className="mt-4 text-muted-foreground">
              We bridge the gap between qualified West African businesses and the contracts they deserve.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg hover:border-accent/40 transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Ready to Win More Contracts?
          </h2>
          <p className="mt-4 text-primary-foreground/70 max-w-lg mx-auto">
            Join hundreds of West African companies already growing through MiddleBrand's opportunity matching platform.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark font-semibold px-8">
              <Link to="/join">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
