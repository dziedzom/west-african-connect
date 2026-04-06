import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionInfo {
  tier: "free" | "pro";
  plan: "monthly" | "annual" | null;
  start: string | null;
  end: string | null;
  amount: number | null;
  loading: boolean;
  isPro: boolean;
}

export const useSubscription = (): SubscriptionInfo => {
  const { user } = useAuth();
  const [info, setInfo] = useState<Omit<SubscriptionInfo, "loading" | "isPro">>({
    tier: "free",
    plan: null,
    start: null,
    end: null,
    amount: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInfo({ tier: "free", plan: null, start: null, end: null, amount: null });
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_plan, subscription_start, subscription_end, subscription_amount")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const isActive = data.subscription_tier === "pro" && 
          (!data.subscription_end || new Date(data.subscription_end) > new Date());
        setInfo({
          tier: isActive ? "pro" : "free",
          plan: data.subscription_plan as "monthly" | "annual" | null,
          start: data.subscription_start,
          end: data.subscription_end,
          amount: data.subscription_amount,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { ...info, loading, isPro: info.tier === "pro" };
};
