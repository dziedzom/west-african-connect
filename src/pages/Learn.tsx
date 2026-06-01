import { Play, Users, UserPlus, Briefcase, Handshake, Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import SEO from "@/components/SEO";

const sections = [
  {
    id: "who-we-are",
    icon: Users,
    title: "Who We Are",
    description:
      "Learn about MiddlBrand's mission to connect vetted African businesses with real contract opportunities. Discover our team, our values, and the impact we're making across the continent.",
    placeholder: "Explainer video — Who We Are",
  },
  {
    id: "signup-process",
    icon: UserPlus,
    title: "The Signup Process",
    description:
      "A step-by-step walkthrough of creating your account, completing your company profile, and uploading your certifications to get matched with the right opportunities.",
    placeholder: "Explainer video — How to Sign Up",
  },
  {
    id: "new-business",
    icon: Briefcase,
    title: "For New Businesses",
    description:
      "See how MiddlBrand sources RFPs, matches them to your expertise, and helps you submit winning bids. From your first login to your first contract — we walk you through the entire journey.",
    placeholder: "Explainer video — New Business Flow",
  },
  {
    id: "partners",
    icon: Handshake,
    title: "For Potential Partners",
    description:
      "Explore partnership opportunities with MiddlBrand. Learn how agencies, consultancies, and service providers can collaborate on larger contracts through our partnership RFP system.",
    placeholder: "Explainer video — Partnership Opportunities",
  },
];

const Learn = () => {
  const gridRef = useScrollReveal(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <>
      <SEO
        title="Learn — How It Works"
        path="/learn"
        description="Watch explainer videos on how MiddlBrand works — from signing up to winning contracts and forming partnerships."
      />
      <section className="py-16 bg-background min-h-screen grain-mesh">
        <div className="container max-w-5xl">
          {/* Header */}
          <div className="mb-16 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              How It Works
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-3 leading-relaxed max-w-lg">
              Short explainer videos walking you through every step — from who
              we are to winning your first contract.
            </p>
          </div>

          {/* Bento grid */}
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const isWide = i === 0;
              return (
                <div
                  key={s.id}
                  className={`reveal rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all ${
                    isWide ? "md:col-span-2" : ""
                  }`}
                >
                  {/* Video / Placeholder */}
                  <div
                    className={`relative bg-muted/40 flex items-center justify-center overflow-hidden ${
                      isWide ? "h-64 md:h-80" : "h-48 md:h-56"
                    }`}
                  >
                    {i === 0 ? (
                      <>
                        <video
                          ref={videoRef}
                          src="/videos/who-we-are.mp4"
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover"
                          onEnded={() => setIsPlaying(false)}
                        />
                        {!isPlaying && (
                          <button
                            onClick={togglePlay}
                            aria-label="Play video"
                            className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 cursor-pointer"
                          >
                            <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
                              <Play className="h-7 w-7 text-accent-foreground ml-1" />
                            </div>
                          </button>
                        )}
                        {isPlaying && (
                          <div className="absolute bottom-3 right-3 flex gap-2 z-10">
                            <button
                              onClick={togglePlay}
                              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center"
                            >
                              <div className="w-2 h-3 border-l-2 border-r-2 border-foreground" />
                            </button>
                            <button
                              onClick={toggleMute}
                              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center"
                            >
                              {isMuted ? (
                                <VolumeX className="h-3.5 w-3.5 text-foreground" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5 text-foreground" />
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                          <Play className="h-6 w-6 text-accent ml-0.5" />
                        </div>
                        <span className="text-[11px] text-muted-foreground font-body tracking-wide uppercase">
                          {s.placeholder}
                        </span>
                      </div>
                    )}

                    {/* Corner badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-1 z-20">
                      <Icon className="h-3 w-3 text-accent" />
                      <span className="text-[10px] font-display font-semibold text-foreground uppercase tracking-wider">
                        {s.title}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <h2 className="text-lg font-display font-bold text-foreground mb-2">
                      {s.title}
                    </h2>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default Learn;
