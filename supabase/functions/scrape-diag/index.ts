// Temporary diagnostic function: probes source URLs through Firecrawl and returns compact stats.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";
const KW = /(tender|bid |invitation|procure|rfp|rfq|expression of interest|appel d'offre|avis|concurso|closing|deadline|submission)/gi;

async function probe(url: string, keys: { lovable: string; fc: string }, render: boolean, main = false, find = "") {
  const started = Date.now();
  try {
    const body: Record<string, unknown> = {
      url,
      formats: ["markdown", "links"],
      onlyMainContent: main,
    };
    if (render) body.waitFor = 6000;
    const res = await fetch(`${GATEWAY}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys.lovable}`,
        "X-Connection-Api-Key": keys.fc,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { url, render, ok: false, status: res.status, error: text.slice(0, 240), ms: Date.now() - started };
    }
    const json = JSON.parse(text);
    const doc = json.data ?? json;
    const md: string = doc.markdown ?? "";
    const links: string[] = doc.links ?? [];
    const kw = (md.match(KW) || []).length;
    const tableRows = (md.match(/\n\|/g) || []).length;
    const dates = (md.match(/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/g) || []).length;
    const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
    const detailish = links.filter((l) => l.includes(host) && /(tender|bid|notice|opportunit|avis|concours|marche|procure|detail|id=|view)/i.test(l));
    return {
      url, render, ok: true, status: doc.metadata?.statusCode ?? 200,
      title: (doc.metadata?.title ?? "").slice(0, 90),
      md_len: md.length, kw, table_rows: tableRows, dates,
      links: links.length, detail_links: detailish.length,
      sample_detail_links: detailish.slice(0, 3).map((l) => l.slice(0, 80)),
      head: md.replace(/\s+/g, " ").slice(0, 180),
      find_at: find ? md.toLowerCase().indexOf(find.toLowerCase()) : null,
      find_slice: find && md.toLowerCase().includes(find.toLowerCase())
        ? md.slice(Math.max(0, md.toLowerCase().indexOf(find.toLowerCase()) - 100), md.toLowerCase().indexOf(find.toLowerCase()) + 900).replace(/\s+/g, " ")
        : null,
      ms: Date.now() - started,
    };
  } catch (e) {
    return { url, render, ok: false, error: e instanceof Error ? e.message : "unknown", ms: Date.now() - started };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const lovable = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const fc = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
  if (!lovable || !fc) {
    return new Response(JSON.stringify({ error: "missing keys" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { urls = [], render = false, main = false } = await req.json().catch(() => ({}));
  const results = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const u of (urls as string[]).slice(0, 4)) {
    let out = await probe(u, { lovable, fc }, render, main);
    for (let i = 0; i < 3 && !out.ok && out.status === 429; i++) {
      await sleep(7000);
      out = await probe(u, { lovable, fc }, render, main);
    }
    results.push(out);
    await sleep(6000);
  }
  return new Response(JSON.stringify({ results }, null, 1), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
