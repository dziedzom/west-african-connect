import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, MapPin, Tag, DollarSign, CalendarDays, X, SlidersHorizontal, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import RFPDetailModal from "@/components/RFPDetailModal";
import { useRFPFilters, CATEGORIES, LOCATIONS, BUDGET_BOUNDS } from "@/hooks/useRFPFilters";
import type { RFP } from "@/types/rfp";
import SEO from "@/components/SEO";
import UpgradeBanner from "@/components/UpgradeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";


const formatBudget = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

const getDeadlineChip = (deadline: string | null) => {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: "Closed", urgent: true };
  if (diffDays === 0) return { text: "Closes today", urgent: true };
  if (diffDays === 1) return { text: "1 day left", urgent: true };
  if (diffDays <= 7) return { text: `${diffDays} days left`, urgent: true };
  if (diffDays <= 14) return { text: `${diffDays} days left`, urgent: false };
  if (diffDays <= 30) return { text: `${Math.floor(diffDays / 7)} weeks left`, urgent: false };
  return { text: `${Math.floor(diffDays / 30)} months left`, urgent: false };
};

const RFPSkeleton = () => (
  <div className="container py-12">
    <Skeleton className="h-10 w-72 mb-2" />
    <Skeleton className="h-5 w-96 mb-10" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 rounded-md" />
      ))}
    </div>
    <div className="space-y-4 mt-8">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-36 rounded-lg" />
      ))}
    </div>
  </div>
);

const RFPListings = () => {
  const {
    filtered,
    loading,
    filters,
    setSearch,
    setCategory,
    setLocation,
    setBudgetRange,
    setDateRange,
    resetFilters,
    activeCount,
  } = useRFPFilters();

  const [selectedRFP, setSelectedRFP] = useState<RFP | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRFPs = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, safeCurrentPage]);

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1); };
  const handleCategory = (v: string) => { setCategory(v); setCurrentPage(1); };
  const handleLocation = (v: string) => { setLocation(v); setCurrentPage(1); };
  const handleBudgetRange = (v: [number, number]) => { setBudgetRange(v); setCurrentPage(1); };
  const handleDateRange = (v: { from: Date | undefined; to: Date | undefined }) => { setDateRange(v); setCurrentPage(1); };
  const handleResetFilters = () => { resetFilters(); setCurrentPage(1); };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };
  if (loading) return <RFPSkeleton />;

  return (
    <>
      <SEO title="RFP Opportunities" path="/rfps" description="Browse open RFP listings and contract opportunities across Africa. Filter by category, location, and value." />
      <section className="py-12 bg-background min-h-screen">
        <div className="container">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Open <span className="text-accent">Opportunities</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Browse active RFPs, tenders and contracts across Africa.</p>
          </div>

          {/* Upgrade banner for free users */}
          {(!user || !isPro) && <UpgradeBanner />}

          {/* Search + Filters */}
          <div className="space-y-4 mb-8">
            {/* Row 1: Search + selects */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search opportunities..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filters.category} onValueChange={handleCategory}>
                <SelectTrigger>
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.location} onValueChange={handleLocation}>
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal text-sm",
                      !(filters.dateRange.from || filters.dateRange.to) && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {filters.dateRange.from
                      ? filters.dateRange.to
                        ? `${format(filters.dateRange.from, "MMM d")} – ${format(filters.dateRange.to, "MMM d")}`
                        : `From ${format(filters.dateRange.from, "MMM d")}`
                      : "Deadline range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                    onSelect={(range) =>
                      handleDateRange({ from: range?.from, to: range?.to })
                    }
                    numberOfMonths={1}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Row 2: Budget slider */}
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-xs font-display font-semibold text-foreground">Budget Range</span>
                </div>
                <span className="text-xs font-body text-muted-foreground">
                  {formatBudget(filters.budgetRange[0])} — {formatBudget(filters.budgetRange[1])}
                </span>
              </div>
              <Slider
                min={BUDGET_BOUNDS.min}
                max={BUDGET_BOUNDS.max}
                step={10_000}
                value={filters.budgetRange}
                onValueChange={(v) => handleBudgetRange(v as [number, number])}
                className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent [&_[role=slider]]:shadow-[0_0_8px_hsl(224_100%_57%/0.4)] [&_[data-orientation=horizontal]>.relative]:bg-accent"
              />
            </div>

            {/* Active filters bar */}
            {activeCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-body">{activeCount} active filter{activeCount > 1 ? "s" : ""}</span>
                <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 px-2 text-xs text-accent hover:text-accent/80">
                  <X className="h-3 w-3 mr-1" /> Clear all
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filtered.length} opportunit{filtered.length === 1 ? "y" : "ies"} found
              {totalPages > 1 && ` · Page ${safeCurrentPage} of ${totalPages}`}
            </p>
          </div>

          <div className="grid gap-4">
            {paginatedRFPs.map((rfp) => (
              <div
                key={`${rfp.source}-${rfp.id}`}
                onClick={() => setSelectedRFP(rfp)}
                className="rounded-lg border border-border bg-card p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-display font-semibold text-foreground">{rfp.title}</h3>
                    {rfp.org && <p className="text-sm text-muted-foreground mt-1">{rfp.org}</p>}
                    {rfp.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rfp.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">{rfp.category}</Badge>
                      {rfp.location && (
                        <Badge variant="outline" className="border-accent/30 text-accent">{rfp.location}</Badge>
                      )}
                      {rfp.value && <Badge variant="outline">{rfp.value}</Badge>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="font-semibold text-foreground">
                        {rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "TBD"}
                      </p>
                      {(() => {
                        const chip = getDeadlineChip(rfp.deadline);
                        if (!chip) return null;
                        return (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "mt-1 text-xs",
                              chip.urgent 
                                ? "border-destructive/50 text-destructive bg-destructive/10" 
                                : "border-muted-foreground/30 text-muted-foreground"
                            )}
                          >
                            {chip.text}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex gap-2">
                      {rfp.source_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={(e) => { e.stopPropagation(); window.open(rfp.source_url!, "_blank"); }}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Source
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={(e) => { e.stopPropagation(); setSelectedRFP(rfp); }}
                      >
                        View Details
                      </Button>
                    </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={cn("cursor-pointer", safeCurrentPage === 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === safeCurrentPage}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={cn("cursor-pointer", safeCurrentPage === totalPages && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>

        <RFPDetailModal rfp={selectedRFP} open={!!selectedRFP} onOpenChange={(open) => !open && setSelectedRFP(null)} />
      </section>
    </>
  );
};

export default RFPListings;
