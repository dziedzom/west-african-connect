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

export const CATEGORIES = ["All", "Pharma", "Transport", "Construction", "IT", "Agriculture", "Energy"];
export const LOCATIONS = ["All", "Ghana", "Nigeria", "Senegal", "Côte d'Ivoire"];
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

  // Fetch once
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("rfps")
        .select("*")
        .order("created_at", { ascending: false });
      setRfps((data as RFP[]) || []);
      setLoading(false);
    };
    fetch();
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
