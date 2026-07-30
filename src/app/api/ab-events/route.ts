import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/security/csrf";
import { verifyEmbedEventToken } from "@/lib/security/embed-origin";
import { readJsonBody } from "@/lib/api/request";
import { ANALYTICS } from "@/lib/constants";

const allowedEvents = new Set(["impression", "play", "progress", "complete"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  // The A/B player posts from the same-origin embed iframe, so this matches the
  // guard already applied to /api/analytics-events.
  if (!validateOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const parsed = await readJsonBody<Record<string, unknown>>(request, ANALYTICS.MAX_EVENT_PAYLOAD_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
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
  // Same proof-of-embed requirement as /api/analytics-events, bound to the
  // video actually served for this variant.
  if (!verifyEmbedEventToken(typeof body?.eventToken === "string" ? body.eventToken : null, variant.video_id)) return NextResponse.json({ error: "invalid_event_token" }, { status: 403 });
  const [{ data: test }, { data: video }, { data: player }] = await Promise.all([
    supabase.from("ab_tests").select("status").eq("id", testId).eq("user_id", variant.user_id).maybeSingle(),
    supabase.from("videos").select("status").eq("id", variant.video_id).eq("user_id", variant.user_id).maybeSingle(),
    supabase.from("player_configs").select("id").eq("video_id", variant.video_id).eq("user_id", variant.user_id).eq("published", true).maybeSingle(),
  ]);
  if (test?.status !== "active" || video?.status !== "ready" || !player) return NextResponse.json({ error: "test_not_active" }, { status: 409 });
  const { error } = await supabase.from("player_events").upsert({ user_id: variant.user_id, video_id: variant.video_id, test_id: testId, variant_id: variantId, session_id: sessionId, event_type: eventType, progress_percent: progressPercent, watched_seconds: watchedSeconds }, { onConflict: "test_id,variant_id,session_id,event_type,progress_percent", ignoreDuplicates: true });
  return error ? NextResponse.json({ error: "event_failed" }, { status: 500 }) : NextResponse.json({ ok: true }, { status: 202 });
}
