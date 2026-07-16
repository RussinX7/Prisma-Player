import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const events = new Set(["impression", "play", "progress", "complete", "cta_click", "conversion"]);
const milestones = new Set([0, 10, 25, 50, 75, 90, 100]);

function clientContext(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : ua ? "desktop" : "other";
  const os = /windows/i.test(ua) ? "Windows" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os|macintosh/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /firefox\//i.test(ua) ? "Firefox" : /chrome\//i.test(ua) ? "Chrome" : /safari\//i.test(ua) ? "Safari" : "Other";
  return { device, os, browser };
}

function source(value: unknown) {
  if (typeof value !== "string" || !value) return "Direto";
  try { return new URL(value).hostname.replace(/^www\./, "").slice(0, 120) || "Direto"; } catch { return "Direto"; }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const videoId = String(body?.videoId ?? "");
  const sessionId = String(body?.sessionId ?? "");
  const eventType = String(body?.eventType ?? "");
  const progressPercent = Number(body?.progressPercent ?? 0);
  if (!uuid.test(videoId) || !uuid.test(sessionId) || !events.has(eventType) || !milestones.has(progressPercent)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: video } = await supabase.from("videos").select("id,user_id,status").eq("id", videoId).maybeSingle();
  if (!video || video.status === "archived") return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const context = clientContext(request);
  const country = (request.headers.get("x-vercel-ip-country") ?? "XX").toUpperCase().slice(0, 2);
  const { error } = await supabase.from("video_events").upsert({
    user_id: video.user_id, video_id: video.id, session_id: sessionId, event_type: eventType,
    progress_percent: progressPercent, watched_seconds: Math.max(0, Math.min(Number(body?.watchedSeconds ?? 0) || 0, 86400)),
    country_code: country.length === 2 ? country : "XX", device_type: context.device,
    os_name: context.os, browser_name: context.browser, traffic_source: source(body?.referrer),
  }, { onConflict: "video_id,session_id,event_type,progress_percent", ignoreDuplicates: true });
  return error ? NextResponse.json({ error: "event_write_failed" }, { status: 500 }) : new NextResponse(null, { status: 204 });
}
