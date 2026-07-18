import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/security/csrf";
import { ANALYTICS } from "@/lib/constants";

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

function pageContext(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return { pageUrl: null, params: new URLSearchParams() };
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return { pageUrl: null, params: new URLSearchParams() };
    url.hash = "";
    return { pageUrl: url.toString().slice(0, 1000), params: url.searchParams };
  } catch { return { pageUrl: null, params: new URLSearchParams() }; }
}

function first(params: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) return value.slice(0, 160);
  }
  return null;
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > ANALYTICS.MAX_EVENT_PAYLOAD_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const isSameOrigin = validateOrigin(request);
  if (!isSameOrigin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const videoId = String(body?.videoId ?? "");
  const sessionId = String(body?.sessionId ?? "");
  const eventType = String(body?.eventType ?? "");
  const progressPercent = Number(body?.progressPercent ?? 0);
  if (!uuid.test(videoId) || !uuid.test(sessionId) || !events.has(eventType) || !milestones.has(progressPercent)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const limited = await rateLimit(request, `analytics:${videoId}:${sessionId}`, { max: ANALYTICS.RATE_LIMIT_MAX_REQUESTS, windowMs: ANALYTICS.RATE_LIMIT_WINDOW_MS });
  if (limited) return limited;

  const supabase = createAdminClient();
  const [{ data: video }, { data: player }] = await Promise.all([
    supabase.from("videos").select("id,user_id,status").eq("id", videoId).maybeSingle(),
    supabase.from("player_configs").select("id").eq("video_id", videoId).eq("published", true).maybeSingle(),
  ]);
  if (!video || video.status !== "ready") return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  if (!player) return NextResponse.json({ error: "player_not_published" }, { status: 409 });
  const context = clientContext(request);
  const ua = request.headers.get("user-agent") ?? "";
  const page = pageContext(body?.pageUrl ?? body?.referrer);
  const watchedSeconds = Math.max(0, Math.min(Number(body?.watchedSeconds ?? 0) || 0, 86400));
  const riskReasons: string[] = [];
  if (!ua) riskReasons.push("missing_user_agent");
  if (/bot|crawler|spider|headless|curl|wget|python|scrapy|phantom/i.test(ua)) riskReasons.push("automation_user_agent");
  if (eventType === "complete" && watchedSeconds < 3) riskReasons.push("impossible_completion");
  const riskScore = Math.min(100, riskReasons.reduce((score, reason) => score + (reason === "automation_user_agent" || reason === "impossible_completion" ? 50 : 25), 0));
  const country = (request.headers.get("x-vercel-ip-country") ?? "XX").toUpperCase().slice(0, 2);
  const { error } = await supabase.from("video_events").upsert({
    user_id: video.user_id, video_id: video.id, session_id: sessionId, event_type: eventType,
    progress_percent: progressPercent, watched_seconds: watchedSeconds,
    country_code: country.length === 2 ? country : "XX", device_type: context.device,
    os_name: context.os, browser_name: context.browser, traffic_source: source(body?.referrer),
    page_url: page.pageUrl,
    campaign_id: first(page.params, ["campaign_id", "fb_campaign_id", "utm_campaign"]),
    creative_id: first(page.params, ["creative_id", "adset_id", "utm_content"]),
    ad_id: first(page.params, ["ad_id", "fb_ad_id"]),
    utm_source: first(page.params, ["utm_source"]),
    utm_medium: first(page.params, ["utm_medium"]),
    utm_campaign: first(page.params, ["utm_campaign"]),
    risk_score: riskScore,
    risk_reasons: riskReasons,
  }, { onConflict: "video_id,session_id,event_type,progress_percent", ignoreDuplicates: true });
  return error ? NextResponse.json({ error: "event_write_failed" }, { status: 500 }) : new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
