import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const AGENT_API_KEY = Deno.env.get("AGENT_API_KEY");
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-agent-rfp`;

Deno.test("Rejects request with wrong API key", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-api-key": "wrong-key" },
    body: JSON.stringify({ title: "Test", description: "Test" }),
  });
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "Unauthorized – invalid or missing agent API key");
});

Deno.test("Rejects request with no API key", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test", description: "Test" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("Rejects GET requests", async () => {
  const res = await fetch(FUNCTION_URL, { method: "GET" });
  assertEquals(res.status, 405);
  await res.text();
});

if (AGENT_API_KEY) {
  Deno.test("Rejects missing required fields", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-api-key": AGENT_API_KEY },
      body: JSON.stringify({ title: "Only title" }),
    });
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "title and description are required");
  });

  Deno.test("Accepts valid RFP with expertise matching", async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-api-key": AGENT_API_KEY },
      body: JSON.stringify({
        title: "Digital Marketing Campaign RFP",
        description: "We need a comprehensive digital marketing strategy including social media content creation, branding guidelines, and analytics dashboard.",
        budget: "$50,000",
        source_url: "https://example.com/rfp/test-123",
      }),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.expertise_match.matched, true);
    // Should match: digital, marketing, social, content, branding, analytics
    console.log("Matched keywords:", body.expertise_match.keywords);
    console.log("Match score:", body.expertise_match.score);
    console.log("Saved RFP ID:", body.rfp.id);
  });
}
