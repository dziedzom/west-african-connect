import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

const DEFAULT_PORTALS = [
  // International / Multilateral
  { name: "UNGM", url: "https://www.ungm.org/Public/Notice" },
  { name: "AfDB", url: "https://www.afdb.org/en/about-us/corporate-procurement/current-opportunities" },
  { name: "DevBusiness", url: "https://www.devbusiness.com/default.aspx" },
  { name: "UNDP Procurement", url: "https://procurement-notices.undp.org/" },
  { name: "World Bank", url: "https://projects.worldbank.org/en/projects-operations/procurement" },
  { name: "TenderInfo Africa", url: "https://www.tendersinfo.com/global-africa-tenders.php" },
  // Regional Bodies
  { name: "ECOWAS", url: "https://www.ecowas.int/procurement/" },
  { name: "SADC", url: "https://www.sadc.int/opportunities/procurement" },
  { name: "AU Commission", url: "https://au.int/en/bids" },
  { name: "COMESA", url: "https://www.comesa.int/procurement/" },
  { name: "EAC", url: "https://www.eac.int/procurement" },
  // Southern Africa
  { name: "SA eTenders", url: "https://www.etenders.gov.za/content/advertised-tenders.html" },
  { name: "Botswana PPADB", url: "https://www.ppadb.co.bw/tenders" },
  { name: "Zambia ZPPA", url: "https://www.zppa.org.zm/tenders" },
  { name: "Mozambique", url: "https://www.ufsa.gov.mz/concursos" },
  { name: "Namibia CPB", url: "https://www.cpb.gov.na/tenders.html" },
  // West Africa
  { name: "Nigeria BPP", url: "https://www.bpp.gov.ng/opportunities/" },
  { name: "Ghana PPA", url: "https://www.ppa.gov.gh/tenders" },
  { name: "Senegal ARMP", url: "https://www.marchespublics.sn/" },
  { name: "Côte d'Ivoire", url: "https://www.marchespublics-ci.net/" },
  // East Africa
  { name: "Kenya PPRA", url: "https://www.ppra.go.ke/tenders/" },
  { name: "Tanzania PPRA", url: "https://www.ppra.go.tz/tenders" },
  { name: "Uganda PPDA", url: "https://www.ppda.go.ug/opportunities/" },
  { name: "Rwanda RPP", url: "https://www.rppa.gov.rw/tenders" },
  { name: "Ethiopia FPPA", url: "https://www.fppa.gov.et/tenders.html" },
  // North Africa
  { name: "Egypt Tenders", url: "https://etenders.gov.eg/" },
  { name: "Morocco MP", url: "https://www.marchespublics.gov.ma/" },
  { name: "Tunisia TUNEPS", url: "https://www.tuneps.tn/" },
];

const BATCH_SIZE = 10;
const MIN_DAYS_UNTIL_DEADLINE = 7;

function isDeadlineValid(deadlineStr: string | null): boolean {
  if (!deadlineStr) return true;
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= MIN_DAYS_UNTIL_DEADLINE;
}

async function scrapePortal(
  target: { name: string; url: string },
  firecrawlKey: string,
  lovableKey: string,
  supabase: ReturnType<typeof createClient>,
  todayISO: string
): Promise<{ portal: string; url: string; rfps_found: number; skipped_expired: number; error?: string }> {
  console.log(`Scraping: ${target.name} - ${target.url}`);

  const scrapeRes = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: target.url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  });

  const scrapeData = await scrapeRes.json();
  if (!scrapeRes.ok) {
    throw new Error(`Firecrawl error: ${JSON.stringify(scrapeData)}`);
  }

  const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
  const links = scrapeData.data?.links || scrapeData.links || [];

  if (!markdown || markdown.length < 100) {
    return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, error: "Page content too short or empty" };
  }

  const truncatedContent = markdown.substring(0, 15000);

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting RFP (Request for Proposal) and tender opportunities from procurement portal content.

CRITICAL RULES:
1. Extract ONLY RFP/tender listings located in AFRICAN countries. Skip any opportunities in non-African countries (e.g. Afghanistan, India, Bangladesh, Philippines, etc.).
   African countries include: Algeria, Angola, Benin, Botswana, Burkina Faso, Burundi, Cameroon, Cape Verde, Central African Republic, Chad, Comoros, Congo, DR Congo, Côte d'Ivoire, Djibouti, Egypt, Equatorial Guinea, Eritrea, Eswatini, Ethiopia, Gabon, Gambia, Ghana, Guinea, Guinea-Bissau, Kenya, Lesotho, Liberia, Libya, Madagascar, Malawi, Mali, Mauritania, Mauritius, Morocco, Mozambique, Namibia, Niger, Nigeria, Rwanda, São Tomé and Príncipe, Senegal, Seychelles, Sierra Leone, Somalia, South Africa, South Sudan, Sudan, Tanzania, Togo, Tunisia, Uganda, Zambia, Zimbabwe.
   If the location is unclear or could be Africa-wide / multi-country within Africa, include it with location set to the best match or "Africa".
2. **TRANSLATE everything to English.** Many portals are in French, Portuguese, or other languages — ALL extracted fields (title, description, category, location, organization) MUST be in English.
3. **Deadlines**: Convert ALL dates to ISO 8601 format (YYYY-MM-DD). Today is ${todayISO}. ONLY include RFPs whose deadline is at least ${MIN_DAYS_UNTIL_DEADLINE} days from today. SKIP any that are already expired or closing within ${MIN_DAYS_UNTIL_DEADLINE} days.
4. If the deadline is ambiguous or missing, still include the RFP but set deadline to null.
5. For category, use standard English categories: IT, Construction, Consulting, Agriculture, Energy, Health, Education, Transport, Marketing, Environment, Finance, Water, Legal, Mining, Pharma, Telecommunications, Other.
6. For location, provide the African country name in English.
7. For source_url, use the most specific link to the individual RFP from the links list. If none match, use the portal URL.

Return ONLY valid JSON via the function call.`,
        },
        {
          role: "user",
          content: `Extract all current, non-expired RFP/tender opportunities from this procurement portal (${target.name}). Links found on page: ${JSON.stringify(links.slice(0, 40))}\n\nContent:\n${truncatedContent}`,
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
                      title: { type: "string", description: "Full title of the RFP/tender in English" },
                      description: { type: "string", description: "Brief description of requirements in English" },
                      deadline: { type: "string", description: "Deadline in ISO 8601 (YYYY-MM-DD) format, null if unknown" },
                      category: { type: "string", description: "Category in English (IT, Construction, Consulting, etc.)" },
                      budget: { type: "string", description: "Budget or value if mentioned, null otherwise" },
                      location: { type: "string", description: "Country name in English" },
                      organization: { type: "string", description: "Issuing organization name in English" },
                      source_url: { type: "string", description: "Direct URL to the RFP if found in the links" },
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
      return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, error: "AI rate limited, try again later" };
    }
    throw new Error(`AI gateway error (${aiRes.status}): ${errText}`);
  }

  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return { portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, error: "AI returned no structured data" };
  }

  const extracted = JSON.parse(toolCall.function.arguments);
  const rfps = extracted.rfps || [];

  let insertedCount = 0;
  let skippedExpired = 0;

  for (const rfp of rfps) {
    if (!rfp.title || !rfp.source_url) continue;

    if (!isDeadlineValid(rfp.deadline)) {
      skippedExpired++;
      console.log(`Skipping expired/near-deadline RFP: "${rfp.title}" (deadline: ${rfp.deadline})`);
      continue;
    }

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

  console.log(`${target.name}: Found ${rfps.length} RFPs, inserted ${insertedCount}, skipped ${skippedExpired} expired`);
  return { portal: target.name, url: target.url, rfps_found: insertedCount, skipped_expired: skippedExpired };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const customUrls: string[] = body.urls || [];
    const portalFilter: string[] = body.portals || [];
    const batch: number | null = typeof body.batch === "number" ? body.batch : null;
    const batchSize: number = body.batch_size || BATCH_SIZE;

    let targets = DEFAULT_PORTALS.filter(
      (p) => portalFilter.length === 0 || portalFilter.includes(p.name)
    ).map((p) => ({ name: p.name, url: p.url }));

    for (const url of customUrls) {
      targets.push({ name: "Custom", url });
    }

    // Apply batching: slice targets based on batch number
    const totalBatches = Math.ceil(targets.length / batchSize);
    if (batch !== null) {
      const start = batch * batchSize;
      const end = start + batchSize;
      console.log(`Batch ${batch}/${totalBatches - 1}: portals ${start}-${Math.min(end, targets.length) - 1} of ${targets.length}`);
      targets = targets.slice(start, end);
    }

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ error: "No targets for this batch", batch, totalBatches }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayISO = new Date().toISOString().split("T")[0];
    const results: Array<{ portal: string; url: string; rfps_found: number; skipped_expired: number; error?: string }> = [];

    for (const target of targets) {
      try {
        const result = await scrapePortal(target, FIRECRAWL_API_KEY, LOVABLE_API_KEY, supabase, todayISO);
        results.push(result);
      } catch (portalError: unknown) {
        const msg = portalError instanceof Error ? portalError.message : "Unknown error";
        console.error(`Error scraping ${target.name}:`, msg);
        results.push({ portal: target.name, url: target.url, rfps_found: 0, skipped_expired: 0, error: msg });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Clean up expired RFPs only on the last batch (or non-batched runs)
    let cleanedCount = 0;
    const isLastBatch = batch === null || batch >= totalBatches - 1;
    if (isLastBatch) {
      const { count } = await supabase
        .from("scraped_rfps")
        .delete({ count: "exact" })
        .lt("deadline", new Date().toISOString())
        .not("deadline", "is", null);
      cleanedCount = count || 0;
      console.log(`Cleaned ${cleanedCount} expired RFPs from database`);
    }

    const totalFound = results.reduce((sum, r) => sum + r.rfps_found, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped_expired, 0);

    return new Response(
      JSON.stringify({
        success: true,
        batch,
        totalBatches,
        portals_processed: targets.length,
        total_rfps_found: totalFound,
        total_skipped_expired: totalSkipped,
        cleaned_expired: cleanedCount,
        results,
      }),
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
