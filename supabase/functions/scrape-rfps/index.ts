import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

const DEFAULT_PORTALS = [
  { name: "UNGM", url: "https://www.ungm.org/Public/Notice" },
  { name: "AfDB", url: "https://www.afdb.org/en/about-us/corporate-procurement/current-opportunities" },
  { name: "SA eTenders", url: "https://www.etenders.gov.za/content/advertised-tenders.html" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const customUrls: string[] = body.urls || [];
    const portalFilter: string[] = body.portals || [];

    // Build target list
    let targets = DEFAULT_PORTALS.filter(
      (p) => portalFilter.length === 0 || portalFilter.includes(p.name)
    ).map((p) => ({ name: p.name, url: p.url }));

    for (const url of customUrls) {
      targets.push({ name: "Custom", url });
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ error: "No targets specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ portal: string; url: string; rfps_found: number; error?: string }> = [];

    for (const target of targets) {
      try {
        console.log(`Scraping: ${target.name} - ${target.url}`);

        // Step 1: Scrape the page with Firecrawl
        const scrapeRes = await fetch(`${FIRECRAWL_API}/scrape`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: target.url,
            formats: ["markdown", "links"],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const scrapeData = await scrapeRes.json();
        if (!scrapeRes.ok) {
          throw new Error(`Firecrawl error: ${JSON.stringify(scrapeData)}`);
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        const links = scrapeData.data?.links || scrapeData.links || [];

        if (!markdown || markdown.length < 100) {
          results.push({ portal: target.name, url: target.url, rfps_found: 0, error: "Page content too short or empty" });
          continue;
        }

        // Step 2: Use AI to extract structured RFP data
        const truncatedContent = markdown.substring(0, 12000);

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are an expert at extracting RFP (Request for Proposal) and tender opportunities from procurement portal content. Extract ALL distinct RFP/tender listings you can find. For each, extract the title, description, deadline, category, budget, location, and organization. Return ONLY valid JSON.`,
              },
              {
                role: "user",
                content: `Extract all RFP/tender opportunities from this procurement portal content. Here are some links found on the page that might be useful for source URLs: ${JSON.stringify(links.slice(0, 30))}\n\nContent:\n${truncatedContent}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_rfps",
                  description: "Extract RFP/tender opportunities from procurement portal content",
                  parameters: {
                    type: "object",
                    properties: {
                      rfps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string", description: "Full title of the RFP/tender" },
                            description: { type: "string", description: "Brief description of requirements" },
                            deadline: { type: "string", description: "Deadline date in ISO format if available, null otherwise" },
                            category: { type: "string", description: "Category like IT, Construction, Consulting, Agriculture, etc." },
                            budget: { type: "string", description: "Budget or value if mentioned, null otherwise" },
                            location: { type: "string", description: "Location/country of the opportunity" },
                            organization: { type: "string", description: "Issuing organization name" },
                            source_url: { type: "string", description: "Direct URL to the RFP if found in the links, otherwise the portal URL" },
                          },
                          required: ["title", "source_url"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["rfps"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_rfps" } },
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          if (aiRes.status === 429) {
            results.push({ portal: target.name, url: target.url, rfps_found: 0, error: "AI rate limited, try again later" });
            continue;
          }
          throw new Error(`AI gateway error (${aiRes.status}): ${errText}`);
        }

        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          results.push({ portal: target.name, url: target.url, rfps_found: 0, error: "AI returned no structured data" });
          continue;
        }

        const extracted = JSON.parse(toolCall.function.arguments);
        const rfps = extracted.rfps || [];

        // Step 3: Upsert into database
        let insertedCount = 0;
        for (const rfp of rfps) {
          if (!rfp.title || !rfp.source_url) continue;

          const { error: upsertError } = await supabase.from("scraped_rfps").upsert(
            {
              title: rfp.title.substring(0, 500),
              description: rfp.description?.substring(0, 2000) || null,
              deadline: rfp.deadline || null,
              category: rfp.category || null,
              budget: rfp.budget || null,
              location: rfp.location || null,
              organization: rfp.organization || null,
              source_url: rfp.source_url,
              portal: target.name,
              status: "open",
              scraped_at: new Date().toISOString(),
            },
            { onConflict: "source_url" }
          );

          if (!upsertError) insertedCount++;
          else console.error(`Upsert error for "${rfp.title}":`, upsertError.message);
        }

        results.push({ portal: target.name, url: target.url, rfps_found: insertedCount });
        console.log(`${target.name}: Found ${rfps.length} RFPs, inserted ${insertedCount}`);

      } catch (portalError: unknown) {
        const msg = portalError instanceof Error ? portalError.message : "Unknown error";
        console.error(`Error scraping ${target.name}:`, msg);
        results.push({ portal: target.name, url: target.url, rfps_found: 0, error: msg });
      }

      // Small delay between portals to respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    const totalFound = results.reduce((sum, r) => sum + r.rfps_found, 0);

    return new Response(
      JSON.stringify({ success: true, total_rfps_found: totalFound, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("scrape-rfps error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
