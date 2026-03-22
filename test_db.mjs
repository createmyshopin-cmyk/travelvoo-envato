const url = "https://rqnxtcigfauzzjaqxzut.supabase.co/rest/v1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbnh0Y2lnZmF1enpqYXF4enV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM3ODQzNywiZXhwIjoyMDg4OTU0NDM3fQ.bDhDWYV0inYhgsaakK5K4UqKFGc2hJP73U_3SWuTlSg";

async function query(table) {
  const res = await fetch(`${url}/${table}?select=*&limit=5`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(`\n--- ${table} ---`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  await query("instagram_webhook_events");
  await query("instagram_channel_activity");
}

main().catch(console.error);
