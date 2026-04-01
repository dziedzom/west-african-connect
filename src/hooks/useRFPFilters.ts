import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RFP } from "@/types/rfp";

export interface RFPFilters {
  search: string;
  category: string;
  location: string;
  budgetRange: [number, number];
  dateRange: { from: Date | undefined; to: Date | undefined };
}

const BUDGET_MIN = 0;
const BUDGET_MAX = 1_000_000;

/** Parse a value string like "$50k–$100k" or "$200,000" into a rough number */
const parseBudgetValue = (val: string | null): number | null => {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.kKmM]/g, "").toLowerCase();
  if (!cleaned) return null;
  let num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  if (cleaned.includes("k")) num *= 1_000;
  if (cleaned.includes("m")) num *= 1_000_000;
  return num;
};

export const CATEGORIES = ["All", "Pharma", "Transport", "Construction", "IT", "Agriculture", "Energy", "Consulting", "Health", "Education", "Environment", "Finance", "Water", "Mining", "Telecommunications"];
export const LOCATIONS = ["All", "Ghana", "Nigeria", "Senegal", "Côte d'Ivoire", "Kenya", "South Africa", "Tanzania", "Uganda", "Rwanda", "Ethiopia", "Cameroon", "Egypt", "Morocco", "Mozambique", "Zambia", "Zimbabwe"];

const AFRICAN_COUNTRIES = new Set([
  "algeria", "angola", "benin", "botswana", "burkina faso", "burundi", "cameroon", "cape verde",
  "central african republic", "chad", "comoros", "congo", "dr congo", "democratic republic of the congo",
  "côte d'ivoire", "ivory coast", "djibouti", "egypt", "equatorial guinea", "eritrea", "eswatini",
  "swaziland", "ethiopia", "gabon", "gambia", "ghana", "guinea", "guinea-bissau", "kenya", "lesotho",
  "liberia", "libya", "madagascar", "malawi", "mali", "mauritania", "mauritius", "morocco", "mozambique",
  "namibia", "niger", "nigeria", "rwanda", "são tomé and príncipe", "senegal", "seychelles",
  "sierra leone", "somalia", "south africa", "south sudan", "sudan", "tanzania", "togo", "tunisia",
  "uganda", "zambia", "zimbabwe", "africa",
]);

const isAfricanLocation = (location: string | null | undefined): boolean => {
  if (!location) return true; // No location = keep it (benefit of doubt)
  return AFRICAN_COUNTRIES.has(location.toLowerCase().trim());
};
export const BUDGET_BOUNDS = { min: BUDGET_MIN, max: BUDGET_MAX } as const;

export function useRFPFilters() {
  const [rfps, setRfps] = useState<RFP[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<RFPFilters>({
    search: "",
    category: "All",
    location: "All",
    budgetRange: [BUDGET_MIN, BUDGET_MAX],
    dateRange: { from: undefined, to: undefined },
  });

  useEffect(() => {
    const now = new Date();
    const nowISO = now.toISOString();

    const isNotExpired = (deadline: string | null | undefined): boolean => {
      if (!deadline) return true;
      const d = new Date(deadline);
      return isNaN(d.getTime()) || d >= now;
    };

    const fetchAll = async () => {
      const [localRes, scrapedRes, externalRes] = await Promise.all([
        supabase.from("rfps").select("*").order("created_at", { ascending: false }),
        supabase
          .from("scraped_rfps")
          .select("*")
          .or(`deadline.is.null,deadline.gte.${nowISO}`)
          .order("scraped_at", { ascending: false }),
        supabase.from("rfp_opportunities").select("*").order("created_at", { ascending: false }),
      ]);

      const local: RFP[] = (localRes.data || [])
        .filter((r) => isNotExpired(r.deadline))
        .map((r) => ({
          ...r,
          source: "local" as const,
        }));

      const scraped: RFP[] = (scrapedRes.data || []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        category: r.category || "Uncategorized",
        org: r.organization,
        location: r.location,
        value: r.budget,
        budget: r.budget,
        deadline: r.deadline,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        source: "scraped" as const,
        source_url: r.source_url,
        portal: r.portal,
      }));

      const external: RFP[] = (externalRes.data || []).map((r) => {
        const parts = r.title.split(" - ");
        const deadlineMatch = r.title.match(/Deadline\s+(.+?)$/i);
        return {
          id: r.id,
          title: r.title,
          description: "",
          category: parts.length >= 3 ? parts.slice(2, -1).join(" - ").replace(/\s*-?\s*Deadline.*$/i, "").trim() || "Uncategorized" : "Uncategorized",
          org: null,
          location: parts.length >= 2 ? parts[1].trim() : null,
          value: null,
          budget: null,
          deadline: deadlineMatch ? deadlineMatch[1].trim() : null,
          status: "open",
          created_at: r.created_at,
          updated_at: r.created_at,
          source: "external" as const,
          source_url: r.source_url,
        };
      }).filter((r) => isNotExpired(r.deadline));

      setRfps([...local, ...scraped, ...external]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const setSearch = useCallback((v: string) => setFilters((f) => ({ ...f, search: v })), []);
  const setCategory = useCallback((v: string) => setFilters((f) => ({ ...f, category: v })), []);
  const setLocation = useCallback((v: string) => setFilters((f) => ({ ...f, location: v })), []);
  const setBudgetRange = useCallback((v: [number, number]) => setFilters((f) => ({ ...f, budgetRange: v })), []);
  const setDateRange = useCallback((v: { from: Date | undefined; to: Date | undefined }) => setFilters((f) => ({ ...f, dateRange: v })), []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "All",
      location: "All",
      budgetRange: [BUDGET_MIN, BUDGET_MAX],
      dateRange: { from: undefined, to: undefined },
    });
  }, []);

  const filtered = useMemo(() => {
    return rfps.filter((r) => {
      // Text search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchText =
          r.title.toLowerCase().includes(q) ||
          (r.org || "").toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        if (!matchText) return false;
      }

      // Category
      if (filters.category !== "All" && r.category !== filters.category) return false;

      // Location
      if (filters.location !== "All" && r.location !== filters.location) return false;

      // Budget range
      const [lo, hi] = filters.budgetRange;
      if (lo !== BUDGET_MIN || hi !== BUDGET_MAX) {
        const budget = parseBudgetValue(r.value) ?? parseBudgetValue(r.budget);
        if (budget !== null && (budget < lo || budget > hi)) return false;
      }

      // Date range
      if (filters.dateRange.from || filters.dateRange.to) {
        if (!r.deadline) return false;
        const d = new Date(r.deadline);
        if (isNaN(d.getTime())) return false;
        if (filters.dateRange.from && d < filters.dateRange.from) return false;
        if (filters.dateRange.to && d > filters.dateRange.to) return false;
      }

      return true;
    });
  }, [rfps, filters]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.category !== "All") count++;
    if (filters.location !== "All") count++;
    if (filters.budgetRange[0] !== BUDGET_MIN || filters.budgetRange[1] !== BUDGET_MAX) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  }, [filters]);

  return {
    rfps,
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
  };
}
