import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXTERNAL_SUPABASE_URL = "https://dvizkdszskstgnkloqce.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2aXprZHN6c2tzdGdua2xvcWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MjQ2MTIsImV4cCI6MjA4ODUwMDYxMn0.R2kUwWCCl_uYNdluJv7ZjRrRUIMy3GYIgln6_Uxtm7U";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch(
      `${EXTERNAL_SUPABASE_URL}/rest/v1/rfp_opportunities?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': EXTERNAL_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${EXTERNAL_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External DB returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("fetch-external-rfps error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
