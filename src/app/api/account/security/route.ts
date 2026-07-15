import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const [{ data: factors }, { data: events }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.from("security_events").select("id,event_type,metadata,created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  return NextResponse.json({ factors: factors?.all ?? [], events: events ?? [] });
}
