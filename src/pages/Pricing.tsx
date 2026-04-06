import { useState } from "react";
import { Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEO from "@/components/SEO";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started exploring African procurement opportunities.",
    features: [
      "Browse all RFP listings",
      "Basic search and filters",
      "View RFP titles and summaries",
    ],
    excluded: [
      "No AI match scoring",
      "No email alerts",
      "No full RFP detail pages",
    ],
    cta: "Get Started Free",
    ctaLink: "/auth",
  },
  {
    name: "Pro Monthly",
    price: "$40",
    period: "/month",
    description: "Unlock AI-powered matching and full RFP intelligence.",
    featured: true,
    features: [
      "Everything in Free, plus:",
      "AI match score on every RFP",
      "Daily email digest of matched opportunities",
      "Full RFP detail pages with AI summary",
      "\"I'm Bidding\" pipeline tracker",
      "Success fee partnership (3.5%, capped at $5,000)",
    ],
    cta: "Start Pro Monthly",
    ctaLink: "/join",
  },
  {
    name: "Pro Annual",
    price: "$32",
    period: "/month",
    annualTotal: "$384/year",
    description: "Save $96 — equivalent to 2 months free.",
    badge: "Best Value",
    features: [
      "Everything in Pro Monthly, plus:",
      "Save $96 per year (20% off)",
      "Priority email support",
      "Billed annually at $384",
    ],
    cta: "Start Pro Annual",
    ctaLink: "/join",
  },
];

const faqs = [
  {
    question: "What is the success fee?",
    answer: "When you win a contract you found through MiddlBrand, a 3.5% fee applies on the contract value, capped at $5,000. Payment is due within 30 days of your first receipt from the contracting authority.",
  },
  {
    question: "When am I charged the success fee?",
    answer: "Only when you self-report a won contract. We trust you to report honestly — our partnership model is built on that.",
  },
  {
    question: "Can I cancel my Pro subscription?",
    answer: "Yes, anytime. You retain Pro access until the end of your billing period.",
  },
  {
    question: "What currencies are supported?",
    answer: "Contract values can be reported in USD, NGN, KES, GHS, ZAR, ETB, TZS, UGX, or RWF. Success fees are invoiced in USD.",
  },
  {
    question: "How does MiddlBrand's matching algorithm work?",
    answer: "Our matching system analyzes your company profile — including expertise, location, capacity, and track record — against live RFPs and tenders across Africa. We use a weighted scoring model to surface the opportunities where you have the highest probability of winning.",
  },
];

const Pricing = () => {
  const tiersRef = useScrollReveal(150);

  return (
    <>
      <SEO
        title="Pricing"
        path="/pricing"
        description="MiddlBrand pricing: Free to browse, $40/month Pro for AI matching and full RFP access. Success fee of 3.5% capped at $5,000."
      />
      <section className="py-16 bg-background min-h-screen">
        <div className="container max-w-5xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Plans that grow with you.
            </h1>
            <p className="mt-4 text-sm text-muted-foreground font-body">
              Start free. Upgrade when you're ready for AI-powered matching and full RFP intelligence.
            </p>
          </div>

          <div ref={tiersRef} className="grid md:grid-cols-3 gap-4 mb-24">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`reveal rounded-2xl border p-8 flex flex-col transition-colors duration-300 relative ${
                  tier.featured
                    ? "border-accent bg-foreground text-background"
                    : "border-border bg-card text-card-foreground hover:border-accent/30"
                }`}
              >
                {tier.badge && (
                  <Badge className="absolute -top-3 right-4 bg-accent text-accent-foreground text-xs px-3">
                    <Crown className="h-3 w-3 mr-1" />
                    {tier.badge}
                  </Badge>
                )}
                <p
                  className={`text-xs font-body uppercase tracking-widest mb-2 ${
                    tier.featured ? "opacity-70" : "text-muted-foreground"
                  }`}
                >
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <p className="text-5xl font-display font-bold">{tier.price}</p>
                  <p
                    className={`text-sm font-body ${
                      tier.featured ? "opacity-70" : "text-muted-foreground"
                    }`}
                  >
                    {tier.period}
                  </p>
                </div>
                {tier.annualTotal && (
                  <p
                    className={`text-xs font-body font-semibold mb-2 ${
                      tier.featured ? "opacity-80" : "text-accent"
                    }`}
                  >
                    {tier.annualTotal}
                  </p>
                )}
                <p
                  className={`text-xs font-body mb-8 leading-relaxed ${
                    tier.featured ? "opacity-80" : "text-muted-foreground"
                  }`}
                >
                  {tier.description}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-body">
                      <Check
                        className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                          tier.featured ? "opacity-70" : "text-accent"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                  {tier.excluded?.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-xs font-body ${
                        tier.featured ? "opacity-40" : "text-muted-foreground/50"
                      } line-through`}
                    >
                      <span className="h-3.5 w-3.5 mt-0.5 shrink-0 text-center">—</span>
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
                  <Link to={tier.ctaLink}>{tier.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* Success Fee Explainer */}
          <div className="max-w-3xl mx-auto mb-24">
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Success Fee: 3.5%, capped at $5,000
              </h2>
              <p className="text-sm text-muted-foreground font-body max-w-lg mx-auto">
                When you win a contract through MiddlBrand, a 3.5% success fee applies — capped at
                $5,000 regardless of contract size. You only pay when you win.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { contract: "$50,000", fee: "$1,750" },
                  { contract: "$100,000", fee: "$3,500" },
                  { contract: "$200,000+", fee: "$5,000 (cap)" },
                ].map((ex) => (
                  <div key={ex.contract} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">
                      Contract
                    </p>
                    <p className="font-display font-semibold text-foreground">{ex.contract}</p>
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-2">
                      Fee
                    </p>
                    <p className="font-display font-semibold text-accent">{ex.fee}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-foreground text-center mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-center text-xs text-muted-foreground font-body mb-10">
              Everything you need to know about working with MiddlBrand.
            </p>

            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-border bg-card px-6 data-[state=open]:border-accent/30 transition-colors duration-300"
                >
                  <AccordionTrigger className="text-sm font-display font-semibold text-foreground hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground font-body leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
};

export default Pricing;
