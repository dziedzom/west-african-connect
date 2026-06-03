import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { rfp_id } = await req.json();
    if (!rfp_id) throw new Error("rfp_id is required");

    // Check if insight already exists
    const { data: existing } = await supabase
      .from("ai_insights")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ status: "exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch RFP details
    const { data: rfp } = await supabase
      .from("rfps")
      .select("*")
      .eq("id", rfp_id)
      .single();

    if (!rfp) throw new Error("RFP not found");

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, expertise, location, about")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch user knowledge base
    const { data: knowledgeBase } = await supabase
      .from("user_knowledge_base")
      .select("title, category, content, tags")
      .eq("user_id", user.id)
      .limit(20);

    const profileSummary = profile
      ? `Company: ${profile.company_name || "N/A"}\nExpertise: ${profile.expertise || "N/A"}\nLocation: ${profile.location || "N/A"}\nAbout: ${profile.about || "N/A"}`
      : "No profile set up.";

    const kbSummary = knowledgeBase && knowledgeBase.length > 0
      ? knowledgeBase.map(k => `[${k.category}] ${k.title}: ${k.content.slice(0, 300)}`).join("\n\n")
      : "No knowledge base entries.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an RFP matching analyst. Evaluate how well a company matches an RFP opportunity. Return structured data via the provided tool.",
          },
          {
            role: "user",
            content: `Analyze this company's fit for the following RFP.

## RFP Details
Title: ${rfp.title}
Description: ${rfp.description}
Category: ${rfp.category}
Organization: ${rfp.org || "N/A"}
Location: ${rfp.location || "N/A"}
Budget: ${rfp.budget || rfp.value || "N/A"}
Deadline: ${rfp.deadline || "N/A"}

## Company Profile
${profileSummary}

## Knowledge Base (Case Studies, Certifications, Capabilities)
${kbSummary}

Evaluate match_score (0-100), provide a winning_strategy_summary (2-3 sentences on how to win), gap_analysis (2-3 sentences on weaknesses/gaps to address), key_requirements (3-6 concise must-have requirements extracted from the RFP), risk_flags (2-5 short risk warnings such as tight deadlines, unclear scope, restricted eligibility, payment terms, etc.), and missing_qualifications (2-5 short items the company appears to lack vs the RFP).`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_analysis",
              description: "Submit the RFP match analysis results",
              parameters: {
                type: "object",
                properties: {
                  match_score: { type: "number", description: "Match score 0-100" },
                  winning_strategy_summary: { type: "string", description: "2-3 sentence strategy to win this RFP" },
                  gap_analysis: { type: "string", description: "2-3 sentence analysis of gaps/weaknesses" },
                  key_requirements: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 concise must-have requirements extracted from the RFP",
                  },
                  risk_flags: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-5 short risk warnings (tight deadlines, unclear scope, restricted eligibility, payment terms, etc.)",
                  },
                  missing_qualifications: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-5 short items the company appears to lack vs the RFP",
                  },
                },
                required: ["match_score", "winning_strategy_summary", "gap_analysis", "key_requirements", "risk_flags", "missing_qualifications"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const analysis = JSON.parse(toolCall.function.arguments);
    const score = Math.min(100, Math.max(0, Math.round(analysis.match_score)));

    const { error: insertError } = await supabase.from("ai_insights").insert({
      rfp_id,
      user_id: user.id,
      match_score: score,
      winning_strategy_summary: analysis.winning_strategy_summary,
      gap_analysis: analysis.gap_analysis,
      key_requirements: analysis.key_requirements ?? [],
      risk_flags: analysis.risk_flags ?? [],
      missing_qualifications: analysis.missing_qualifications ?? [],
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      status: "created",
      match_score: score,
      winning_strategy_summary: analysis.winning_strategy_summary,
      gap_analysis: analysis.gap_analysis,
      key_requirements: analysis.key_requirements ?? [],
      risk_flags: analysis.risk_flags ?? [],
      missing_qualifications: analysis.missing_qualifications ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-insights error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
