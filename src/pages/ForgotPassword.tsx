import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <>
      <SEO title="Forgot Password" path="/forgot-password" description="Reset your MiddlBrand account password and restore access to your RFP matches, proposals, and Bid Studio tools." />
      <section className="py-16 bg-background min-h-screen flex items-center">
        <div className="container max-w-md">
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-foreground">Reset Password</h1>
                <p className="mt-2 text-muted-foreground font-body text-sm">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="rounded-2xl border border-border p-8 text-center backdrop-blur-xl bg-card/60 shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                <Mail className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Check Your Email</h2>
              <p className="mt-3 text-muted-foreground font-body text-sm leading-relaxed">
                We've sent a password reset link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                <br />
                Click the link in the email to set a new password.
              </p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground font-body mt-6">
            <Link to="/auth" className="inline-flex items-center gap-1 text-accent hover:underline font-medium">
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </p>
        </div>
      </section>
    </>
  );
};

export default ForgotPassword;
