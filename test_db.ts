import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("Checking DB for recent webhook activity...");
  
  const { data: config } = await sb.from("instagram_automation_config").select("*").limit(5);
  console.log("Config (master switch):", config);
  
  const { data: rules } = await sb.from("instagram_automation_keyword_rules").select("*").limit(5);
  console.log("Rules:", rules);

  const { data: activity } = await sb
    .from("instagram_channel_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  
  console.log("Recent activity:\n", activity);
  
  const { data: webhooks } = await sb
    .from("instagram_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
    
  console.log("Recent webhook dedupe events:\n", webhooks);
}

main().catch(console.error);
