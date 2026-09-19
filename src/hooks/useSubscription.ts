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
  /** True when Pro access comes from the admin role rather than a subscription. */
  proViaAdmin: boolean;
}

export const useSubscription = (): SubscriptionInfo => {
  const { user, isAdmin } = useAuth();
  type State = Omit<SubscriptionInfo, "loading" | "isPro">;
  const empty: State = {
    tier: "free",
    plan: null,
    start: null,
    end: null,
    amount: null,
    proViaAdmin: false,
  };
  const [info, setInfo] = useState<State>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInfo(empty);
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
        // Matches the server-side check in supabase/functions/_shared/entitlements.ts:
        // the plan stays valid through the end of the subscription_end day, and
        // the admin role grants Pro-level access on its own.
        const isActive = data.subscription_tier === "pro" &&
          (!data.subscription_end ||
            new Date(`${data.subscription_end}T23:59:59.999Z`).getTime() >= Date.now());
        setInfo({
          tier: isActive || isAdmin ? "pro" : "free",
          plan: data.subscription_plan as "monthly" | "annual" | null,
          start: data.subscription_start,
          end: data.subscription_end,
          amount: data.subscription_amount,
          proViaAdmin: !isActive && isAdmin,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, isAdmin]);

  return { ...info, loading, isPro: info.tier === "pro", proViaAdmin: info.proViaAdmin };
};
