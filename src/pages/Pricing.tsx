import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tiers = [
  {
    name: "Standard",
    commission: "10%",
    description: "For companies getting started with MiddlBrand.",
    features: [
      "Access to all RFP listings",
      "Email opportunity alerts",
      "Basic bid preparation guidance",
      "Standard matching algorithm",
    ],
  },
  {
    name: "Premium",
    commission: "12%",
    description: "Enhanced support for growing businesses.",
    featured: true,
    features: [
      "Everything in Standard",
      "Priority opportunity matching",
      "Dedicated account manager",
      "Market intelligence reports",
      "Direct introductions to buyers",
    ],
  },
  {
    name: "Enterprise",
    commission: "15%",
    description: "Full-service support for complex contracts.",
    features: [
      "Everything in Premium",
      "Custom bid preparation",
      "Due diligence support",
      "Joint venture facilitation",
      "Compliance & legal guidance",
      "Post-award contract support",
    ],
  },
];

const scenarios = [
  {
    title: "Small Supply Contract",
    value: "$50,000",
    tier: "Standard (10%)",
    fee: "$5,000",
    description: "A vetted supplier wins a government procurement contract for office equipment.",
  },
  {
    title: "Infrastructure Project",
    value: "$250,000",
    tier: "Premium (12%)",
    fee: "$30,000",
    description: "A construction firm secures a road rehabilitation project through priority matching.",
  },
  {
    title: "Multi-Year Service Agreement",
    value: "$1,000,000",
    tier: "Enterprise (15%)",
    fee: "$150,000",
    description: "An IT company lands a 3-year digital transformation contract with full bid support.",
  },
];

const Pricing = () => {
  const tiersRef = useScrollReveal(150);
  const scenariosRef = useScrollReveal(100);

  return (
    <section className="py-16 bg-background min-h-screen">
      <div className="container max-w-5xl">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Simple, success-based pricing.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground font-body">
            No upfront fees. No monthly subscriptions. You only pay when you win a contract through MiddlBrand.
          </p>
        </div>

        <div ref={tiersRef} className="grid md:grid-cols-3 gap-4 mb-24">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`reveal rounded-2xl border p-8 flex flex-col transition-colors duration-300 ${
                tier.featured
                  ? "border-accent bg-foreground text-background"
                  : "border-border bg-card text-card-foreground hover:border-accent/30"
              }`}
            >
              <p className={`text-xs font-body uppercase tracking-widest mb-2 ${tier.featured ? "opacity-70" : "text-muted-foreground"}`}>
                {tier.name}
              </p>
              <p className="text-5xl font-display font-bold mb-1">{tier.commission}</p>
              <p className={`text-xs font-body mb-6 ${tier.featured ? "opacity-70" : "text-muted-foreground"}`}>
                commission per win
              </p>
              <p className={`text-xs font-body mb-8 leading-relaxed ${tier.featured ? "opacity-80" : "text-muted-foreground"}`}>
                {tier.description}
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs font-body">
                    <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tier.featured ? "opacity-70" : "text-accent"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`rounded-full transition-all duration-300 ${
                  tier.featured
                    ? "bg-background text-foreground hover:bg-background/90 w-full"
                    : "w-full"
                }`}
                variant={tier.featured ? "default" : "outline"}
              >
                <Link to="/join">Get Started</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
            Example scenarios
          </h2>
          <p className="text-center text-xs text-muted-foreground font-body mb-10">
            See how commission works in practice across different contract sizes.
          </p>

          <div ref={scenariosRef} className="space-y-3">
            {scenarios.map((s) => (
              <div key={s.title} className="reveal rounded-2xl border border-border bg-card p-6 hover:border-accent/30 transition-colors duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{s.description}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Contract</p>
                      <p className="font-display font-semibold text-foreground">{s.value}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{s.tier}</p>
                      <p className="font-display font-semibold text-foreground">{s.fee}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground font-body mt-8">
            Commission is only charged on successful contract awards facilitated through MiddlBrand.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
