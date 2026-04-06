import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, LogIn, LayoutDashboard, Moon, Sun, ArrowRight, Shield, Facebook, Linkedin, Twitter, MessageCircle } from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/rfps", label: "RFPs" },
  { to: "/pricing", label: "Pricing" },
  { to: "/join", label: "Join" },
  { to: "/partnerships", label: "Partners" },
  { to: "/knowledge-base", label: "Knowledge" },
  { to: "/learn", label: "Learn" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <>
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <nav className="flex items-center justify-between gap-2 rounded-full border border-border/50 bg-background/60 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-foreground/5">
          <Link to="/" className="font-display text-lg font-bold tracking-tight text-foreground pl-2">
            MiddlBrand
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-3 py-1.5 text-xs font-medium transition-colors rounded-full ${
                  location.pathname === l.to
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
                {location.pathname === l.to && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <NotificationCenter />
            {user ? (
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <Button asChild variant="ghost" size="sm" className="rounded-full text-xs h-8">
                    <Link to="/admin"><Shield className="h-3.5 w-3.5 mr-1" /> Admin</Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="rounded-full text-xs h-8">
                  <Link to="/dashboard"><LayoutDashboard className="h-3.5 w-3.5 mr-1" /> Dashboard</Link>
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8 px-4">
                <Link to="/auth"><LogIn className="h-3.5 w-3.5 mr-1" /> Sign In</Link>
              </Button>
            )}
          </div>

          <button className="lg:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`text-2xl font-display font-bold transition-colors ${
                location.pathname === l.to ? "text-accent" : "text-foreground hover:text-accent"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setDark(!dark)}
              className="p-3 rounded-full border border-border text-muted-foreground"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user ? (
              <Button asChild size="lg" className="rounded-full">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground">
                <Link to="/auth" onClick={() => setMobileOpen(false)}>Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setSubLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already subscribed", description: "This email is already on our list." });
      } else {
        toast({ title: "Error", description: "Could not subscribe. Try again.", variant: "destructive" });
      }
    } else {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-12">
          <div>
            <p className="text-sm font-body opacity-60 max-w-xs">
              Connecting vetted African companies to real business opportunities. No upfront fees.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4 text-xs uppercase tracking-widest opacity-50">Links</h4>
            <div className="flex flex-col gap-2">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className="text-sm font-body opacity-60 hover:opacity-100 hover:text-accent transition-all">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4 text-xs uppercase tracking-widest opacity-50">Connect</h4>
            <div className="flex items-center gap-3 mb-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-primary-foreground/20 text-primary-foreground/60 hover:text-accent hover:border-accent transition-all">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-primary-foreground/20 text-primary-foreground/60 hover:text-accent hover:border-accent transition-all">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-primary-foreground/20 text-primary-foreground/60 hover:text-accent hover:border-accent transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-primary-foreground/20 text-primary-foreground/60 hover:text-accent hover:border-accent transition-all">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
            <p className="text-sm font-body opacity-40">info@middlbrand.com</p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4 text-xs uppercase tracking-widest opacity-50">Newsletter</h4>
            <p className="text-xs font-body opacity-50 mb-4">Get the latest opportunities delivered to your inbox.</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 text-xs h-9"
                required
              />
              <Button type="submit" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-9 px-4 shrink-0">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>
            {subscribed && (
              <p className="text-xs font-body text-accent mt-2">Subscribed!</p>
            )}
          </div>
        </div>

        {/* Massive logo */}
        <div className="border-t border-primary-foreground/10 pt-8">
          <p className="font-display font-black text-[12vw] md:text-[8vw] leading-none tracking-tighter opacity-10 select-none">
            MiddlBrand
          </p>
          <p className="text-xs font-body opacity-30 mt-4">© 2026 MiddlBrand. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1 pt-24">{children}</main>
    <Footer />
  </div>
);

export default Layout;
