import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Heart, CalendarDays } from "lucide-react";
import type { RFP } from "@/types/rfp";

const SavedRFPsList = () => {
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("savedRfps");
    return new Set(stored ? JSON.parse(stored) : []);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRfps = async () => {
      const { data } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      setRfps((data as RFP[]) || []);
      setLoading(false);
    };
    fetchRfps();
  }, []);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("savedRfps", JSON.stringify([...next]));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (rfps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Heart className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No RFPs available.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rfps.map((rfp) => {
        const isSaved = savedIds.has(rfp.id);
        return (
          <li
            key={rfp.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-accent/30"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-display font-semibold truncate text-foreground">{rfp.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">{rfp.category}</Badge>
                {rfp.deadline && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(rfp.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => toggleSave(rfp.id)}
              className="group/heart shrink-0 p-2 rounded-full transition-all hover:bg-accent/10"
              aria-label={isSaved ? "Unsave RFP" : "Save RFP"}
            >
              <Heart
                className={`h-4 w-4 transition-all duration-200 ${
                  isSaved
                    ? "fill-accent text-accent scale-110"
                    : "text-muted-foreground group-hover/heart:text-accent group-hover/heart:scale-110"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default SavedRFPsList;
