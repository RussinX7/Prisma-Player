import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedEvents = new Set(["impression", "play", "progress", "complete"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const testId = typeof body?.testId === "string" ? body.testId : "";
  const variantId = typeof body?.variantId === "string" ? body.variantId : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const eventType = typeof body?.eventType === "string" ? body.eventType : "";
  const progressPercent = Number(body?.progressPercent ?? 0);
  const watchedSeconds = Math.max(0, Math.min(Number(body?.watchedSeconds ?? 0), 86400));
  if (![testId, variantId, sessionId].every((id) => uuid.test(id)) || !allowedEvents.has(eventType) || ![0, 25, 50, 75, 100].includes(progressPercent)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const limited = await rateLimit(request, `ab:${testId}:${variantId}:${sessionId}`, { max: 120, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = createAdminClient();
  const { data: variant } = await supabase.from("ab_test_variants").select("user_id,video_id,test_id").eq("id", variantId).eq("test_id", testId).maybeSingle();
  if (!variant) return NextResponse.json({ error: "variant_not_found" }, { status: 404 });
  const [{ data: test }, { data: video }, { data: player }] = await Promise.all([
    supabase.from("ab_tests").select("status").eq("id", testId).eq("user_id", variant.user_id).maybeSingle(),
    supabase.from("videos").select("status").eq("id", variant.video_id).eq("user_id", variant.user_id).maybeSingle(),
    supabase.from("player_configs").select("id").eq("video_id", variant.video_id).eq("user_id", variant.user_id).eq("published", true).maybeSingle(),
  ]);
  if (test?.status !== "active" || video?.status !== "ready" || !player) return NextResponse.json({ error: "test_not_active" }, { status: 409 });
  const { error } = await supabase.from("player_events").upsert({ user_id: variant.user_id, video_id: variant.video_id, test_id: testId, variant_id: variantId, session_id: sessionId, event_type: eventType, progress_percent: progressPercent, watched_seconds: watchedSeconds }, { onConflict: "test_id,variant_id,session_id,event_type,progress_percent", ignoreDuplicates: true });
  return error ? NextResponse.json({ error: "event_failed" }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 202 });
}
