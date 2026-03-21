import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/integrations/supabase/service-role";

export async function POST(req: Request) {
  let body: { tenant_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.tenant_id) {
    return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
  }

  const sb = createServiceRoleClient();
  await sb.from("tenant_instagram_connections" as any).delete().eq("tenant_id", body.tenant_id);

  return NextResponse.json({ success: true });
}
