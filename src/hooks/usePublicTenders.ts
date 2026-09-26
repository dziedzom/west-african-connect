import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicTender } from "@/lib/tenderSeo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc as any;

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
