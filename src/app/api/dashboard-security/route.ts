import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { purgeEmbedManifest } from "@/lib/cache/embed-purge";
import { createClient } from "@/lib/supabase/server";
import { csrfGuard } from "@/lib/security/csrf";

const normalize = (value: unknown) => typeof value === "string"
  ? value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  : "";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("account_security_settings").select("allowed_domains,updated_at").eq("user_id", userId).maybeSingle();
  return error ? NextResponse.json({ error: "security_load_failed" }, { status: 500 }) : NextResponse.json({ domains: data?.allowed_domains ?? [] });
}

export async function PUT(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { domains?: unknown } | null;
  const domains = Array.isArray(body?.domains) ? [...new Set(body.domains.map(normalize).filter(Boolean))].slice(0, 100) : [];
  const supabase = await createClient();
  const { data: affected } = await supabase.from("player_configs").select("id").eq("user_id", userId);
  const { error } = await supabase.from("account_security_settings").upsert({ user_id: userId, allowed_domains: domains, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "security_save_failed" }, { status: 400 });
  await supabase.from("player_configs").update({ allowed_domains: domains, updated_at: new Date().toISOString() }).eq("user_id", userId);
  if (affected?.length) await Promise.all(affected.map((row) => purgeEmbedManifest(row.id)));
  return NextResponse.json({ domains });
}
