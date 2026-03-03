import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check hash for recovery type
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2500);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <>
        <SEO title="Password Updated" path="/reset-password" description="Your password has been updated." />
        <section className="py-16 bg-background min-h-screen flex items-center">
          <div className="container max-w-md">
            <div className="rounded-2xl border border-border p-8 text-center backdrop-blur-xl bg-card/60 shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                <CheckCircle className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Password Updated</h2>
              <p className="mt-3 text-muted-foreground font-body text-sm">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title="Set New Password" path="/reset-password" description="Set a new password for your MiddlBrand account." />
      <section className="py-16 bg-background min-h-screen flex items-center">
        <div className="container max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground">Set New Password</h1>
            <p className="mt-2 text-muted-foreground font-body text-sm">
              {ready ? "Enter your new password below." : "Verifying your reset link..."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                disabled={!ready}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                disabled={!ready}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !ready}
              className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
};

export default ResetPassword;
