import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Mail, CheckCircle } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      setGoogleLoading(false);
      return;
    }

    if (result.redirected) {
      return; // browser is redirecting
    }

    // Session set — navigate
    toast({ title: "Welcome!" });
    navigate("/dashboard");
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!" });
        navigate("/dashboard");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        setSignupComplete(true);
      }
    }
    setLoading(false);
  };

  return (
    <>
      <SEO title="Sign In" path="/auth" description="Sign in or create a MiddlBrand account to access RFP opportunities and your company dashboard." />
      <section className="py-16 bg-background min-h-screen flex items-center">
        <div className="container max-w-md">
          {signupComplete ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-accent" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">Check your email</h1>
                  <p className="text-muted-foreground font-body text-sm">
                We've sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click the link in your email to activate your account and start your 7-day Pro trial.
              </p>
              <Button variant="outline" className="rounded-full mt-2" onClick={() => { setSignupComplete(false); setIsLogin(true); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-foreground">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="mt-2 text-muted-foreground font-body text-sm">
                  {isLogin ? "Sign in to your MiddlBrand account" : "Start your free 7-day Pro trial — no credit card required"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
                {/* Google OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full font-semibold"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {googleLoading ? "Please wait..." : "Continue with Google"}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-body">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Email/Password form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold transition-all duration-300">
                    {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
                  </Button>
                </form>
              </div>

              <div className="text-center text-xs text-muted-foreground font-body mt-4 space-y-1">
                <p>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button onClick={() => setIsLogin(!isLogin)} className="text-accent hover:underline font-medium">
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </p>
                {isLogin && (
                  <p>
                    <a href="/forgot-password" className="text-accent hover:underline font-medium">Forgot password?</a>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default Auth;
