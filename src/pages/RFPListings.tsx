import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, MapPin, Tag, DollarSign, CalendarDays, X, SlidersHorizontal, ExternalLink, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import RFPDetailModal from "@/components/RFPDetailModal";
import { useRFPFilters, CATEGORIES, LOCATIONS, BUDGET_BOUNDS } from "@/hooks/useRFPFilters";
import { formatRecordedValue, type RFP } from "@/types/rfp";
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
    setShowGlobal,
    resetFilters,
    activeCount,
    globalHiddenCount,
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
  // Most published notices withhold the contract value, so the value column only
  // earns its space when a meaningful share of the current results carry one.
  // Below that threshold the figures fold into the row itself instead.
  const recordedValueCount = useMemo(
    () => filtered.filter((rfp) => formatRecordedValue(rfp) !== null).length,
    [filtered]
  );
  const showRecordedValue = recordedValueCount >= Math.max(3, Math.ceil(filtered.length * 0.2));

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
      <section className="py-8 bg-background min-h-screen">
        <div className="container">
          <div className="mb-5 max-w-3xl">
            <h1 className="screen-title font-display font-semibold text-foreground">
              Open Opportunities
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Browse active RFPs, tenders and contracts across Africa.</p>
          </div>

          {/* Upgrade banner for free users */}
          {(!user || !isPro) && <UpgradeBanner />}

          {/* Search + Filters */}
          <div className="space-y-3 mb-5">
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
            <div className="rounded-md border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-display font-semibold text-foreground">Budget Range</span>
                </div>
                <span className="text-xs font-data text-muted-foreground">
                  {formatBudget(filters.budgetRange[0])} — {formatBudget(filters.budgetRange[1])}
                </span>
              </div>
              <Slider
                min={BUDGET_BOUNDS.min}
                max={BUDGET_BOUNDS.max}
                step={10_000}
                value={filters.budgetRange}
                onValueChange={(v) => handleBudgetRange(v as [number, number])}
                className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent [&_[data-orientation=horizontal]>.relative]:bg-accent"
              />
            </div>

            {/* Africa toggle + active filters bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-body text-foreground">Show global opportunities</span>
                <Switch checked={filters.showGlobal} onCheckedChange={(v) => { setShowGlobal(v); setCurrentPage(1); }} />
                {!filters.showGlobal && globalHiddenCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">({globalHiddenCount} hidden)</span>
                )}
              </div>
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
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} opportunit{filtered.length === 1 ? "y" : "ies"} found
              {totalPages > 1 && ` · Page ${safeCurrentPage} of ${totalPages}`}
            </p>
          </div>

          {/* Column header — desktop only, stable across the result set */}
          <div
            className={`hidden md:grid gap-4 px-3 pb-2 border-b border-border text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground ${
              showRecordedValue
                ? "md:grid-cols-[minmax(0,1fr)_9rem_7rem_8rem_7rem_2.5rem]"
                : "md:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_2.5rem]"
            }`}
          >
            <span>Opportunity</span>
            <span>Location / Category</span>
            {showRecordedValue && <span>Value</span>}
            <span>Deadline</span>
            <span>Source</span>
            <span className="sr-only">Action</span>
          </div>

          <div className="divide-y divide-border panel-enter">
            {paginatedRFPs.map((rfp) => {
              const chip = getDeadlineChip(rfp.deadline);
              const recorded = formatRecordedValue(rfp);
              return (
                <div
                  key={`${rfp.source}-${rfp.id}`}
                  onClick={() => setSelectedRFP(rfp)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelectedRFP(rfp); }}
                  className={`grid gap-1.5 md:gap-4 px-3 py-3 items-start cursor-pointer transition-colors hover:bg-secondary/50 ${
                    showRecordedValue
                      ? "md:grid-cols-[minmax(0,1fr)_9rem_7rem_8rem_7rem_2.5rem]"
                      : "md:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem_2.5rem]"
                  }`}
                >
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium leading-snug text-foreground line-clamp-2">{rfp.title}</h2>
                    {rfp.org && <p className="text-xs text-muted-foreground mt-0.5 truncate">{rfp.org}</p>}
                    {/* When the value column is folded away, a recorded figure still shows here */}
                    {!showRecordedValue && recorded && (
                      <p className="mt-1 text-xs font-data text-foreground">{recorded}</p>
                    )}
                  </div>

                  <div className="min-w-0 text-xs text-muted-foreground">
                    <p className="truncate text-foreground">{rfp.location || "—"}</p>
                    <p className="truncate">{rfp.category}</p>
                  </div>

                  {showRecordedValue && (
                    <div className="text-sm font-data text-foreground">{recorded ?? <span className="text-muted-foreground">—</span>}</div>
                  )}

                  <div className="min-w-0">
                    <p className="font-data text-sm text-foreground">
                      {rfp.deadline ? format(new Date(rfp.deadline), "d MMM yyyy") : "—"}
                    </p>
                    {chip && (
                      <span className={cn("text-xs", chip.urgent ? "text-destructive" : "text-muted-foreground")}>
                        {chip.text}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-data text-muted-foreground truncate block">{rfp.portal || rfp.source}</span>
                  </div>

                  <div className="flex md:justify-end">
                    {rfp.source_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={(e) => { e.stopPropagation(); window.open(rfp.source_url!, "_blank"); }}
                        aria-label="Open source notice"
                        title="Open source notice"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-14 text-muted-foreground">
                <p className="text-sm">No opportunities match your filters.</p>
                <p className="text-xs mt-1">Try adjusting your search criteria.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
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
