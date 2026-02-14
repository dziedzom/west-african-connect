import { useState, useMemo } from "react";
import { Search, MapPin, Tag, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RFPDetailModal from "@/components/RFPDetailModal";

const categories = ["All", "Pharma", "Transport", "Construction", "IT", "Agriculture", "Energy"];
const locations = ["All", "Ghana", "Nigeria", "Senegal", "Côte d'Ivoire"];
const valueRanges = ["All", "$50k–$100k", "$100k–$200k", "$200k–$500k", "$500k+"];

interface RFP {
  id: number;
  title: string;
  org: string;
  category: string;
  location: string;
  value: string;
  deadline: string;
  description: string;
}

const mockRFPs: RFP[] = [
  { id: 1, title: "Supply of Pharmaceutical Products", org: "Ghana Health Service", category: "Pharma", location: "Ghana", value: "$100k–$200k", deadline: "2026-03-15", description: "Procurement of essential medicines for regional hospitals across three districts. Requirements include WHO-approved medications, cold chain logistics capability, and a minimum 5-year track record in pharmaceutical distribution." },
  { id: 2, title: "Fleet Logistics & Transport", org: "Lagos State Gov.", category: "Transport", location: "Nigeria", value: "$200k–$500k", deadline: "2026-04-01", description: "Comprehensive logistics support for state-wide transportation project including fleet management, route optimization, and maintenance services for 200+ vehicles." },
  { id: 3, title: "Solar Panel Installation", org: "ECOWAS Energy Fund", category: "Energy", location: "Senegal", value: "$500k+", deadline: "2026-03-28", description: "Large-scale solar installation across 15 rural communities. Includes panel procurement, installation, grid connection, and 3-year maintenance contract." },
  { id: 4, title: "Road Construction Phase II", org: "Federal Ministry of Works", category: "Construction", location: "Nigeria", value: "$500k+", deadline: "2026-05-10", description: "Highway expansion project in south-western region covering 45km. Requires earthworks, asphalt laying, drainage systems, and road marking." },
  { id: 5, title: "IT Infrastructure Upgrade", org: "Accra Digital Centre", category: "IT", location: "Ghana", value: "$100k–$200k", deadline: "2026-03-20", description: "Modernize data centre infrastructure including server upgrades, cybersecurity systems, network redesign, and staff training program." },
  { id: 6, title: "Cocoa Processing Equipment", org: "Ivorian Agri Board", category: "Agriculture", location: "Côte d'Ivoire", value: "$50k–$100k", deadline: "2026-04-15", description: "Supply and installation of cocoa processing machinery including fermentation tanks, drying equipment, and quality control systems." },
  { id: 7, title: "Hospital Bed Procurement", org: "Korle-Bu Teaching Hospital", category: "Pharma", location: "Ghana", value: "$50k–$100k", deadline: "2026-04-05", description: "Procurement of 200 adjustable hospital beds with mattresses for the new surgical wing. Must meet international medical equipment standards." },
  { id: 8, title: "Public Transit Bus Fleet", org: "Abuja Transport Authority", category: "Transport", location: "Nigeria", value: "$200k–$500k", deadline: "2026-05-01", description: "Purchase of 50 CNG-powered buses for the new BRT corridor. Includes after-sales service, spare parts supply, and driver training." },
];

const RFPListings = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [valueRange, setValueRange] = useState("All");
  const [selectedRFP, setSelectedRFP] = useState<RFP | null>(null);

  const filtered = useMemo(() => {
    return mockRFPs.filter((r) => {
      const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.org.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || r.category === category;
      const matchLoc = location === "All" || r.location === location;
      const matchVal = valueRange === "All" || r.value === valueRange;
      return matchSearch && matchCat && matchLoc && matchVal;
    });
  }, [search, category, location, valueRange]);

  return (
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
                    <Badge variant="outline" className="border-accent/30 text-accent">{rfp.location}</Badge>
                    <Badge variant="outline">{rfp.value}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="font-semibold text-foreground">{rfp.deadline}</p>
                  <Button size="sm" className="mt-3 bg-accent text-accent-foreground hover:bg-gold-dark" onClick={(e) => { e.stopPropagation(); setSelectedRFP(rfp); }}>
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
