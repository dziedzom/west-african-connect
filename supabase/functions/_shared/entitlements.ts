// Server-side subscription gating and usage metering for AI features.
//
// Every AI edge function must call `authorizeAiRequest` BEFORE spending an AI
// call, and `recordAiUsage` AFTER the call succeeds. Both run with the service
// role, because the `prevent_profile_privileged_updates` trigger blocks any
// client-credential write to subscription/usage columns.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

export type UsageFeature =
  | "rfps_analysed"
  | "bids_generated"
  | "bids_reviewed"
  | "checklists_created"
  | "insights_generated"
  | "proposals_drafted";

// Monthly allowances per plan. Free has no AI access at all — the Bid Studio,
// AI insights and AI proposal drafting are Pro features. The 7-day trial
// granted at sign-up sets tier=pro with subscription_end = start + 7 days, so
// trial users get the Pro allowances until that date and are then treated as
// free by these same checks.
export const PLAN_LIMITS: Record<"free" | "pro", Record<UsageFeature, number>> = {
  free: {
    rfps_analysed: 0,
    bids_generated: 0,
    bids_reviewed: 0,
    checklists_created: 0,
    insights_generated: 0,
    proposals_drafted: 0,
  },
  pro: {
    rfps_analysed: 100,
    bids_generated: 50,
    bids_reviewed: 50,
    checklists_created: 50,
    insights_generated: 200,
    proposals_drafted: 50,
  },
};

const FEATURE_LABEL: Record<UsageFeature, string> = {
  rfps_analysed: "RFP analyses",
  bids_generated: "bid drafts",
  bids_reviewed: "bid reviews",
  checklists_created: "submission checklists",
  insights_generated: "AI insights",
  proposals_drafted: "AI proposal drafts",
};

export interface AuthorizedRequest {
  userId: string;
  admin: SupabaseClient;
  tier: "free" | "pro";
  limit: number;
  used: number;
}

export interface AuthorizationFailure {
  response: Response;
}

export const corsHeadersFor = (extra: Record<string, string> = {}) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  ...extra,
});

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const createAdminClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

/** True when the profile has an active paid or trial Pro subscription today. */
export const isProActive = (profile: {
  subscription_tier?: string | null;
  subscription_end?: string | null;
}): boolean => {
  if (profile?.subscription_tier !== "pro") return false;
  if (!profile.subscription_end) return true;
  // subscription_end is a date; the plan is valid through the end of that day.
  const end = new Date(`${profile.subscription_end}T23:59:59.999Z`);
  return end.getTime() >= Date.now();
};

const monthsElapsed = (from: string): boolean => {
  const start = new Date(`${from}T00:00:00.000Z`);
  const cutoff = new Date(start);
  cutoff.setUTCMonth(cutoff.getUTCMonth() + 1);
  return Date.now() >= cutoff.getTime();
};

/**
 * Verifies the caller's JWT, confirms an active Pro plan (paid or trial), rolls
 * the usage month over when due, and checks the plan allowance for `feature`.
 *
 * Returns either an authorized context or a ready-to-return Response.
 */
export async function authorizeAiRequest(
  req: Request,
  feature: UsageFeature,
  cors: Record<string, string> = corsHeadersFor(),
): Promise<AuthorizedRequest | AuthorizationFailure> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { response: json({ error: "Please sign in to use this feature." }, 401, cors) };
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const { data: { user }, error: authError } = await anon.auth.getUser();
  if (authError || !user) {
    return { response: json({ error: "Please sign in to use this feature." }, 401, cors) };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "subscription_tier, subscription_end, usage_period_start, rfps_analysed, bids_generated, bids_reviewed, checklists_created, insights_generated, proposals_drafted",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("entitlements: failed to load profile", profileError);
    return { response: json({ error: "Could not verify your subscription. Please try again." }, 500, cors) };
  }
  if (!profile) {
    return { response: json({ error: "Your account profile is missing. Please contact support." }, 403, cors) };
  }

  const pro = isProActive(profile);
  const tier: "free" | "pro" = pro ? "pro" : "free";

  if (!pro) {
    const expired = profile.subscription_tier === "pro" && profile.subscription_end;
    return {
      response: json(
        {
          error: expired
            ? "Your Pro trial has ended. Upgrade to Pro to keep using the AI tools."
            : "This is a Pro feature. Upgrade to Pro to use the AI tools.",
          code: expired ? "trial_expired" : "pro_required",
          tier: "free",
        },
        403,
        cors,
      ),
    };
  }

  // Roll the usage month over when a full month has elapsed.
  let used = (profile as Record<string, number>)[feature] ?? 0;
  if (monthsElapsed(profile.usage_period_start)) {
    const { error: resetError } = await admin
      .from("profiles")
      .update({
        usage_period_start: new Date().toISOString().slice(0, 10),
        rfps_analysed: 0,
        bids_generated: 0,
        bids_reviewed: 0,
        checklists_created: 0,
        insights_generated: 0,
        proposals_drafted: 0,
      })
      .eq("user_id", user.id);
    if (resetError) {
      console.error("entitlements: usage period reset failed", resetError);
    } else {
      used = 0;
    }
  }

  const limit = PLAN_LIMITS[tier][feature];
  if (used >= limit) {
    return {
      response: json(
        {
          error: `You have used all ${limit} ${FEATURE_LABEL[feature]} included this month. Your allowance resets at the start of your next usage month.`,
          code: "limit_reached",
          feature,
          limit,
          used,
        },
        429,
        cors,
      ),
    };
  }

  return { userId: user.id, admin, tier, limit, used };
}

export const isAuthorizationFailure = (
  result: AuthorizedRequest | AuthorizationFailure,
): result is AuthorizationFailure => "response" in result;

/**
 * Increments a usage counter with the service role and verifies the write.
 * Never swallow the error: an unmetered AI call is a billing hole.
 */
export async function recordAiUsage(
  ctx: AuthorizedRequest,
  feature: UsageFeature,
): Promise<boolean> {
  const { data, error } = await ctx.admin
    .from("profiles")
    .update({ [feature]: ctx.used + 1 })
    .eq("user_id", ctx.userId)
    .select(feature)
    .maybeSingle();

  if (error || !data) {
    console.error(
      `entitlements: FAILED to increment ${feature} for user ${ctx.userId}`,
      error ?? "no row updated",
    );
    return false;
  }
  console.log(`entitlements: ${feature} for ${ctx.userId} -> ${(data as Record<string, number>)[feature]}`);
  return true;
}
