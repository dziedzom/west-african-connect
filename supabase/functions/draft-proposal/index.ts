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

    // Fetch RFP details
    const { data: rfp } = await supabase.from("rfps").select("*").eq("id", rfp_id).single();
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
      ? knowledgeBase.map(k => `[${k.category}] ${k.title}: ${k.content.slice(0, 500)}`).join("\n\n")
      : "No knowledge base entries.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an expert proposal writer for government and corporate RFPs. Write professional, compelling proposals that:
- Address every requirement mentioned in the RFP
- Highlight relevant experience from the company's knowledge base (case studies, certifications, capabilities)
- Use clear structure with sections: Executive Summary, Understanding of Requirements, Proposed Approach, Relevant Experience, Why Us, Timeline & Deliverables
- Be specific and data-driven where possible
- Maintain a professional but confident tone
- Keep it concise but thorough (800-1200 words)`,
          },
          {
            role: "user",
            content: `Draft a proposal for the following RFP based on our company profile and knowledge base.

## RFP Details
Title: ${rfp.title}
Description: ${rfp.description}
Category: ${rfp.category}
Organization: ${rfp.org || "N/A"}
Location: ${rfp.location || "N/A"}
Budget: ${rfp.budget || rfp.value || "N/A"}
Deadline: ${rfp.deadline || "N/A"}

## Our Company Profile
${profileSummary}

## Our Knowledge Base (Case Studies, Certifications, Capabilities)
${kbSummary}

Write a complete, ready-to-submit proposal draft.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const draft = aiData.choices?.[0]?.message?.content;
    if (!draft) throw new Error("No content in AI response");

    return new Response(JSON.stringify({
      title: `Proposal: ${rfp.title}`,
      content: draft,
      rfp_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-proposal error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
