import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-api-key",
};

// MiddlBrand expertise keywords for matching
const EXPERTISE_KEYWORDS = [
  "marketing",
  "advertising",
  "branding",
  "communication",
  "digital",
  "production",
  "strategy",
  "creative",
  "media",
  "campaign",
  "content",
  "social",
  "web",
  "design",
  "analytics",
];

function checkExpertiseMatch(description: string): {
  matched: boolean;
  keywords: string[];
  score: number;
} {
  const lower = description.toLowerCase();
  const matched = EXPERTISE_KEYWORDS.filter((kw) => lower.includes(kw));
  return {
    matched: matched.length > 0,
    keywords: matched,
    score: Math.round((matched.length / EXPERTISE_KEYWORDS.length) * 100),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Security Check ---
  const agentApiKey = req.headers.get("x-agent-api-key");
  const expectedKey = Deno.env.get("AGENT_API_KEY");

  if (!expectedKey || agentApiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized – invalid or missing agent API key" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // --- Parse body ---
  let body: { title?: string; description?: string; budget?: string; source_url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { title, description, budget, source_url } = body;

  if (!title || !description) {
    return new Response(
      JSON.stringify({ error: "title and description are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // --- Expertise match check ---
  const expertiseResult = checkExpertiseMatch(description);

  // --- Insert into rfps table ---
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("rfps")
    .insert({
      title,
      description,
      budget: budget ?? null,
      category: "agent_sourced",
      org: source_url ?? null,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to save RFP", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      rfp: data,
      expertise_match: expertiseResult,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
