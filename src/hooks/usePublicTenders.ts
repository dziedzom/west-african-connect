import { useQuery } from "@tanstack/react-query";
import type { PublicTender } from "@/lib/tenderSeo";

// Public read-only functions, called over plain REST (the client proxy is unreliable in preview).
const BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/rest/v1/rpc`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
async function rpc(fn: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${BASE}/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { data: null, error: new Error(`${fn} ${res.status}`) };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/** All public tenders (open, closing soon, expired, awards). Cached for landing pages and related links. */
export function usePublicTenders() {
  return useQuery({
    queryKey: ["public-tenders"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PublicTender[]> => {
      const { data, error } = await rpc("list_public_tenders", { _limit: 20000 });
      if (error) throw error;
      return (data ?? []) as PublicTender[];
    },
  });
}

export interface PublicTenderDetail extends PublicTender {
  source_url: string;
  official_source_url: string | null;
  document_urls: string[] | null;
  value_basis: string | null;
  created_at: string;
}

export function usePublicTender(shortId: string | undefined) {
  return useQuery({
    queryKey: ["public-tender", shortId],
    enabled: !!shortId,
    queryFn: async (): Promise<PublicTenderDetail | null> => {
      const { data, error } = await rpc("get_public_tender", { _short_id: shortId });
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as PublicTenderDetail | null;
    },
  });
}
