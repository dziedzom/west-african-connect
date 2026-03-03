import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, Tag, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RFPDetailModal from "@/components/RFPDetailModal";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";

const categories = ["All", "Pharma", "Transport", "Construction", "IT", "Agriculture", "Energy"];
const locations = ["All", "Ghana", "Nigeria", "Senegal", "Côte d'Ivoire"];
const valueRanges = ["All", "$50k–$100k", "$100k–$200k", "$200k–$500k", "$500k+"];

const RFPSkeleton = () => (
  <div className="container py-12">
    <Skeleton className="h-10 w-72 mb-2" />
    <Skeleton className="h-5 w-96 mb-10" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 rounded-md" />
      ))}
    </div>
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-36 rounded-lg" />
      ))}
    </div>
  </div>
);

const RFPListings = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [valueRange, setValueRange] = useState("All");
  const [selectedRFP, setSelectedRFP] = useState<RFP | null>(null);
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<RFP[]>([]);

  useEffect(() => {
    const fetchRfps = async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setRfps(data as RFP[]);
      setLoading(false);
    };
    fetchRfps();
  }, []);

  const filtered = useMemo(() => {
    return rfps.filter((r) => {
      const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.org || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || r.category === category;
      const matchLoc = location === "All" || r.location === location;
      const matchVal = valueRange === "All" || r.value === valueRange;
      return matchSearch && matchCat && matchLoc && matchVal;
    });
  }, [search, category, location, valueRange, rfps]);

  if (loading) return <RFPSkeleton />;

  return (
    <>
    <SEO title="RFP Opportunities" path="/rfps" description="Browse open RFP listings and contract opportunities across West Africa. Filter by category, location, and value." />
    <section className="py-12 bg-background min-h-screen">
      <div className="container">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Open <span className="text-accent">Opportunities</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Browse active RFPs, tenders and contracts across West Africa.</p>
        </div>

        {/* Filters */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><Tag className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger><MapPin className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>{locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={valueRange} onValueChange={setValueRange}>
            <SelectTrigger><DollarSign className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Value Range" /></SelectTrigger>
            <SelectContent>{valueRanges.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} opportunit{filtered.length === 1 ? "y" : "ies"} found</p>

        <div className="grid gap-4">
          {filtered.map((rfp) => (
            <div
              key={rfp.id}
              onClick={() => setSelectedRFP(rfp)}
              className="rounded-lg border border-border bg-card p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-display font-semibold text-foreground">{rfp.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{rfp.org}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rfp.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary">{rfp.category}</Badge>
                    {rfp.location && <Badge variant="outline" className="border-accent/30 text-accent">{rfp.location}</Badge>}
                    {rfp.value && <Badge variant="outline">{rfp.value}</Badge>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="font-semibold text-foreground">{rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "TBD"}</p>
                  <Button size="sm" className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90" onClick={(e) => { e.stopPropagation(); setSelectedRFP(rfp); }}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">No opportunities match your filters.</p>
              <p className="text-sm mt-1">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      </div>

      <RFPDetailModal rfp={selectedRFP} open={!!selectedRFP} onOpenChange={(open) => !open && setSelectedRFP(null)} />
    </section>
  );
};

export default RFPListings;
