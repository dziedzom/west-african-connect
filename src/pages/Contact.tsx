import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ title: "Message Sent", description: "We'll respond within 24 hours." });
  };

  return (
    <section className="py-12 bg-background min-h-screen">
      <div className="container max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          Get in <span className="text-accent">Touch</span>
        </h1>
        <p className="text-muted-foreground font-body text-sm mb-10">Have questions about MiddlBrand? We'd love to hear from you.</p>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-display font-semibold text-foreground text-sm">Email</p>
                <p className="text-xs text-muted-foreground font-body">info@middlbrand.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-display font-semibold text-foreground text-sm">Phone</p>
                <p className="text-xs text-muted-foreground font-body">+233 30 123 4567</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-display font-semibold text-foreground text-sm">Office</p>
                <p className="text-xs text-muted-foreground font-body">Airport City, Accra, Ghana</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-3 rounded-2xl border border-border bg-card p-6 space-y-4">
            {sent ? (
              <div className="py-12 text-center animate-fade-in">
                <p className="text-lg font-display font-semibold text-foreground">Thank you!</p>
                <p className="text-xs text-muted-foreground font-body mt-1">We'll get back to you shortly.</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" required placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required placeholder="you@company.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" required rows={5} placeholder="Tell us more..." />
                </div>
                <Button type="submit" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300">
                  Send Message
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
