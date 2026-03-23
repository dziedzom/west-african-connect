import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const expertiseOptions = ["Pharmaceuticals", "Transport & Logistics", "Construction", "IT & Tech", "Agriculture", "Energy", "Consulting", "Manufacturing"];
const locationGroups = [
  { region: "North Africa", countries: ["Algeria", "Egypt", "Libya", "Morocco", "Sudan", "Tunisia"] },
  { region: "West Africa", countries: ["Benin", "Burkina Faso", "Cabo Verde", "Côte d'Ivoire", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Liberia", "Mali", "Mauritania", "Niger", "Nigeria", "Senegal", "Sierra Leone", "Togo"] },
  { region: "Central Africa", countries: ["Cameroon", "Central African Republic", "Chad", "Congo (Brazzaville)", "Congo (DRC)", "Equatorial Guinea", "Gabon", "São Tomé and Príncipe"] },
  { region: "East Africa", countries: ["Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", "Madagascar", "Malawi", "Mauritius", "Mozambique", "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", "Uganda"] },
  { region: "Southern Africa", countries: ["Angola", "Botswana", "Eswatini", "Lesotho", "Namibia", "South Africa", "Zambia", "Zimbabwe"] },
];

const CompanySignUp = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expertise, setExpertise] = useState("");
  const [locationVal, setLocationVal] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in or create an account first.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      company_name: formData.get("company") as string,
      email: formData.get("email") as string,
      expertise,
      location: locationVal,
      website: (formData.get("website") as string) || null,
      about: (formData.get("about") as string) || null,
    }, { onConflict: "user_id" });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Application Received!", description: "We'll review your details and get back to you within 48 hours." });
    }
  };

  if (submitted) {
    return (
      <section className="py-24 bg-background min-h-screen">
        <div className="container max-w-lg text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Application Submitted!</h1>
          <p className="mt-4 text-muted-foreground font-body text-sm">Thank you for registering. Our team will review your company profile and reach out within 48 hours.</p>
        </div>
      </section>
    );
  }

  return (
    <>
    <SEO title="Join" path="/join" description="Register your company with MiddlBrand and get matched to RFP opportunities across Africa. No upfront fees." />
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-2xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Join the MiddlBrand Directory
          </h1>
          <p className="mt-2 text-muted-foreground font-body text-sm">Register your company to receive matched opportunities. It's free — we only earn when you win.</p>
          {!user && (
            <p className="mt-2 text-sm text-accent font-body">
              You'll need to <a href="/auth" className="underline font-semibold">sign in</a> before submitting.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input id="company" name="company" required placeholder="e.g. Kofi & Sons Ltd." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="info@company.com" defaultValue={user?.email || ""} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expertise">Primary Expertise *</Label>
              <Select required value={expertise} onValueChange={setExpertise}>
                <SelectTrigger id="expertise"><SelectValue placeholder="Select expertise" /></SelectTrigger>
                <SelectContent>{expertiseOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select required value={locationVal} onValueChange={setLocationVal}>
                <SelectTrigger id="location"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input id="website" name="website" type="url" placeholder="https://yourcompany.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">Tell us about your company</Label>
            <Textarea id="about" name="about" rows={4} placeholder="Brief description of your company, key projects, and capabilities..." />
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300">
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground font-body">By submitting, you agree to our terms of service. No fees until you win a contract.</p>
        </form>
      </div>
    </section>
    </>
  );
};

export default CompanySignUp;
