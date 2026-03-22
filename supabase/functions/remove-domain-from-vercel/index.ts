import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { domain } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vercelToken = Deno.env.get("VERCEL_TOKEN") || Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");
    const vercelTeamId = Deno.env.get("VERCEL_TEAM_ID");

    if (!vercelToken || !vercelProjectId) {
      console.error("Missing Vercel environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration missing for Vercel integration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the request URL to remove a domain
    const url = new URL(`https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${domain}`);
    if (vercelTeamId) {
      url.searchParams.append("teamId", vercelTeamId);
    }

    console.log(`Removing domain ${domain} from Vercel...`);
    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vercel API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ error: `Vercel API error: ${response.status}`, details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log(`Successfully removed domain ${domain} from Vercel.`);
    
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
