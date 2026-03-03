import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Settings } from "lucide-react";

const expertiseOptions = ["Pharmaceuticals", "Transport & Logistics", "Construction", "IT & Tech", "Agriculture", "Energy", "Consulting", "Manufacturing"];
const locationOptions = ["Ghana", "Nigeria", "Senegal", "Côte d'Ivoire", "Cameroon", "Togo", "Benin", "Other"];

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [expertise, setExpertise] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setCompanyName(data.company_name || "");
        setEmail(data.email || "");
        setExpertise(data.expertise || "");
        setLocation(data.location || "");
        setWebsite(data.website || "");
        setAbout(data.about || "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      company_name: companyName || null,
      email: email || null,
      expertise: expertise || null,
      location: location || null,
      website: website || null,
      about: about || null,
    }, { onConflict: "user_id" });

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated", description: "Your company profile has been saved." });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl py-12">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <>
    <SEO title="Profile Settings" path="/profile" description="Edit your MiddlBrand company profile, expertise, and contact information." />
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-2xl">
        <div className="flex items-center gap-2 mb-8">
          <Settings className="h-5 w-5 text-accent" />
          <h1 className="text-3xl font-display font-bold text-foreground">Company Profile</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Kofi & Sons Ltd." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expertise">Primary Expertise</Label>
              <Select value={expertise} onValueChange={setExpertise}>
                <SelectTrigger id="expertise"><SelectValue placeholder="Select expertise" /></SelectTrigger>
                <SelectContent>{expertiseOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{locationOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">About</Label>
            <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={4} placeholder="Brief description of your company..." />
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300">
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </div>
    </section>
    </>
  );
};

export default ProfileSettings;
