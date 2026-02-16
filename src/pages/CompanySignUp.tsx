import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const expertiseOptions = ["Pharmaceuticals", "Transport & Logistics", "Construction", "IT & Tech", "Agriculture", "Energy", "Consulting", "Manufacturing"];
const locationOptions = ["Ghana", "Nigeria", "Senegal", "Côte d'Ivoire", "Cameroon", "Togo", "Benin", "Other"];

const CompanySignUp = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Application Received!", description: "We'll review your details and get back to you within 48 hours." });
  };

  if (submitted) {
    return (
      <section className="py-24 bg-background min-h-screen">
        <div className="container max-w-lg text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Application Submitted!</h1>
          <p className="mt-4 text-muted-foreground">Thank you for registering. Our team will review your company profile and reach out within 48 hours.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-2xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Join the MiddleBrand Directory
          </h1>
          <p className="mt-2 text-muted-foreground">Register your company to receive matched opportunities. It's free — we only earn when you win.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input id="company" required placeholder="e.g. Kofi & Sons Ltd." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email *</Label>
              <Input id="email" type="email" required placeholder="info@company.com" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expertise">Primary Expertise *</Label>
              <Select required>
                <SelectTrigger id="expertise"><SelectValue placeholder="Select expertise" /></SelectTrigger>
                <SelectContent>{expertiseOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select required>
                <SelectTrigger id="location"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input id="website" type="url" placeholder="https://yourcompany.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">Tell us about your company</Label>
            <Textarea id="about" rows={4} placeholder="Brief description of your company, key projects, and capabilities..." />
          </div>

          <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-gold-dark font-semibold">
            Submit Application
          </Button>
          <p className="text-xs text-center text-muted-foreground">By submitting, you agree to our terms of service. No fees until you win a contract.</p>
        </form>
      </div>
    </section>
  );
};

export default CompanySignUp;
