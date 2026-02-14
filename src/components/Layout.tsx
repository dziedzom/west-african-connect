import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/rfps", label: "RFP Listings" },
  { to: "/join", label: "Join Us" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-accent">Middl</span>
          <span className="text-2xl font-display font-bold text-foreground">Brand</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-accent ${
                location.pathname === l.to ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-card px-6 pb-4">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 text-sm font-medium transition-colors hover:text-accent ${
                location.pathname === l.to ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

const Footer = () => (
  <footer className="border-t border-border bg-primary text-primary-foreground">
    <div className="container py-12 grid gap-8 md:grid-cols-3">
      <div>
        <h3 className="text-xl font-display font-bold mb-3">
          <span className="text-accent">Middl</span>Brand
        </h3>
        <p className="text-sm opacity-80 max-w-xs">
          Connecting vetted West African companies to real business opportunities through ethical lead generation.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-70">Quick Links</h4>
        <div className="flex flex-col gap-2">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm opacity-80 hover:text-accent transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-70">Connect</h4>
        <div className="flex gap-4">
          <a href="#" className="text-sm opacity-80 hover:text-accent transition-colors">LinkedIn</a>
          <a href="#" className="text-sm opacity-80 hover:text-accent transition-colors">Twitter</a>
          <a href="#" className="text-sm opacity-80 hover:text-accent transition-colors">Facebook</a>
        </div>
        <p className="text-sm opacity-60 mt-4">info@middlbrand.com</p>
      </div>
    </div>
    <div className="border-t border-primary-foreground/10 py-4">
      <p className="text-center text-xs opacity-50">© 2026 MiddlBrand. All rights reserved.</p>
    </div>
  </footer>
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default Layout;
