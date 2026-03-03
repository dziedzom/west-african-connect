import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
    <SEO title="Page Not Found" path={location.pathname} description="The page you're looking for doesn't exist on MiddlBrand." />
    <section className="min-h-[80vh] flex items-center justify-center bg-background">
      <div className="container max-w-2xl text-center px-6">
        {/* Large 404 number */}
        <p className="text-[20vw] sm:text-[16vw] md:text-[12vw] font-display font-black leading-none tracking-tighter text-foreground/5 select-none">
          404
        </p>

        {/* Message */}
        <div className="-mt-6 sm:-mt-10 md:-mt-14 relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground">
            Page not found
          </h1>
          <p className="mt-4 text-sm text-muted-foreground font-body max-w-md mx-auto">
            The page at <span className="font-semibold text-foreground">{location.pathname}</span> doesn't exist. It may have been moved or removed.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="group rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 transition-all duration-300"
            >
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Return to Home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-foreground/20 text-foreground hover:border-accent hover:text-accent transition-all duration-300"
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>

        {/* Decorative accent line */}
        <div className="mt-16 mx-auto w-16 h-0.5 bg-accent/30 rounded-full" />
      </div>
    </section>
  );
};

export default NotFound;
