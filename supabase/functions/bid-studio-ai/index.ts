import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, (vars: Record<string, string>) => { system: string; user: string }> = {
  analyser: (v) => ({
    system: `You are a senior procurement consultant specialising in African government and multilateral procurement.`,
    user: `Analyse the following RFP document and return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence plain English summary of what is being procured",
  "contracting_authority": "name of the issuing organisation",
  "country": "country of the opportunity",
  "deadline": "submission deadline in plain English",
  "estimated_value": "contract value if mentioned or null",
  "eligibility": [
    {"requirement": "requirement text", "met": null}
  ],
  "documents_required": ["list of every document required for submission"],
  "evaluation_criteria": [
    {"criterion": "criterion name", "weight": "weighting percentage or null"}
  ],
  "red_flags": ["any concerning clauses, unusual requirements, or disqualifying conditions"],
  "win_strategy": "3-4 sentence recommended bid approach for an African SME"
}

Return ONLY valid JSON. No preamble. No markdown fences. No explanation.

RFP CONTENT:
${v.rfp_text}`,
  }),

  writer: (v) => ({
    system: `You are an expert bid writer specialising in African government and multilateral procurement. You write clear, compelling, compliant bid responses for SMEs competing for government contracts across Africa.`,
    user: `Using the RFP requirements and company information below, draft the following six bid sections. Write in formal procurement language. Be specific and compelling — avoid generic statements. Directly address the contracting authority's stated needs and evaluation criteria.

Return a JSON object with exactly these fields:
{
  "executive_summary": "300-400 word compelling opening that directly addresses the contracting authority's core need and summarises why this company should win",
  "company_background": "200-300 word professional company overview establishing credibility and relevant experience",
  "technical_approach": "400-500 word detailed methodology responding directly to the technical requirements",
  "team_and_personnel": "200-300 word presentation of the proposed team and their relevant qualifications",
  "relevant_experience": "200-300 word section connecting past projects directly to this opportunity",
  "compliance_statement": "100-150 word formal confirmation of compliance with key requirements"
}

Return ONLY valid JSON. No preamble. No markdown fences.

RFP: ${v.rfp_text}
COMPANY INFORMATION: ${v.company_info}`,
  }),

  reviewer: (v) => ({
    system: `You are a senior procurement evaluator with 20 years experience evaluating bids for African government agencies and multilateral organisations. You are rigorous, fair, and specific in your feedback.`,
    user: `Review the bid response against the RFP requirements and return a JSON object:
{
  "overall_score": number between 0 and 100,
  "grade": "A, B, C, D, or F",
  "verdict": "one sentence honest overall assessment",
  "category_scores": {
    "compliance": { "score": number 0-100, "recommendation": "one-line specific recommendation" },
    "technical_strength": { "score": number 0-100, "recommendation": "one-line specific recommendation" },
    "pricing_value": { "score": number 0-100, "recommendation": "one-line specific recommendation" },
    "language_clarity": { "score": number 0-100, "recommendation": "one-line specific recommendation" },
    "completeness": { "score": number 0-100, "recommendation": "one-line specific recommendation" }
  },
  "strengths": ["specific things the bid does well — minimum 3"],
  "weaknesses": ["specific things that need improvement — minimum 3"],
  "missing_elements": ["requirements from the RFP not addressed in the bid"],
  "compliance_check": [
    {
      "requirement": "requirement text from RFP",
      "addressed": true or false,
      "comment": "brief specific comment"
    }
  ],
  "specific_improvements": [
    {
      "section": "section name",
      "issue": "what is weak or missing",
      "suggestion": "exactly how to fix it"
    }
  ],
  "competitive_assessment": "honest assessment of how competitive this bid is likely to be and the main reasons why",
  "win_probability": {
    "percentage": number 0-100 estimating realistic chance of winning given the bid score, RFP complexity, and likely market competitiveness for this type of opportunity in Africa,
    "confidence": "low, medium, or high",
    "rationale": "1-2 sentence plain-English explanation of how this probability was estimated, referencing the bid score, RFP complexity, and competitive landscape",
    "benchmark": "one-line context like 'Bids scoring above 80 in this category typically win 3 out of 5 times'",
    "boost_tips": [
      {
        "action": "specific concrete action the bidder can take",
        "estimated_lift": "approximate percentage point lift, e.g. '+15%'"
      }
    ]
  }
}

Return ONLY valid JSON. No preamble. No markdown fences.

RFP REQUIREMENTS: ${v.rfp_text}
BID DRAFT: ${v.bid_draft}`,
  }),

  checklist: (v) => ({
    system: `You are a procurement project manager specialising in African government contracting.`,
    user: `Generate a practical submission checklist and backwards timeline.

Return a JSON object:
{
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "days_before_deadline": number,
      "task": "specific actionable task description",
      "priority": "critical, important, or optional"
    }
  ],
  "document_checklist": [
    {
      "document": "document name",
      "typical_processing_time": "realistic time to obtain this in Africa",
      "tips": "practical country-specific tip for obtaining this document quickly"
    }
  ],
  "submission_day_checklist": [
    "ordered list of tasks to complete on submission day"
  ],
  "common_mistakes": [
    "top 5 mistakes African SMEs make that cause disqualification"
  ]
}

Today's date: ${v.today_date}
Submission deadline: ${v.deadline}
Required documents: ${v.documents}
Country: ${v.country}

Return ONLY valid JSON. No preamble. No markdown fences.`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tool, variables } = await req.json();
    if (!tool || !PROMPTS[tool]) {
      return new Response(JSON.stringify({ error: "Invalid tool" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = PROMPTS[tool](variables || {});

    // TODO: Switch to Claude claude-opus-4-5 when ANTHROPIC_API_KEY is added
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Our AI assistant is busy right now — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Our AI assistant is busy right now — please try again in a moment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI JSON:", content);
      return new Response(JSON.stringify({ error: "Our AI assistant is busy right now — please try again in a moment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment usage counter
    const counterMap: Record<string, string> = {
      analyser: "rfps_analysed",
      writer: "bids_generated",
      reviewer: "bids_reviewed",
      checklist: "checklists_created",
    };
    const col = counterMap[tool];
    if (col) {
      const { data: profile } = await supabase
        .from("profiles")
        .select(col)
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ [col]: ((profile as any)[col] || 0) + 1 })
          .eq("user_id", user.id);
      }
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bid-studio-ai error:", e);
    return new Response(
      JSON.stringify({ error: "Our AI assistant is busy right now — please try again in a moment." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
