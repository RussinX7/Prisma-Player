import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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

  if (!error) {
    void processIntelligence(
      supabase,
      video.user_id,
      video.id,
      sessionId,
      eventType,
      progressPercent,
      watchedSeconds,
      country.length === 2 ? country : "XX",
      context.device,
      context.os,
      context.browser
    );
  }

  return error ? NextResponse.json({ error: "event_write_failed" }, { status: 500 }) : new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}

async function processIntelligence(
  supabase: any,
  userId: string,
  videoId: string,
  sessionId: string,
  eventType: string,
  progressPercent: number,
  watchedSeconds: number,
  country: string,
  deviceType: string,
  osName: string,
  browserName: string
) {
  try {
    const { data: controls } = await supabase
      .from("intelligence_controls")
      .select("outgoing_webhooks_enabled,webhook_url,webhook_events,conversion_alerts_enabled,conversion_drop_threshold")
      .eq("user_id", userId)
      .maybeSingle();

    if (!controls) return;

    // 1. OUTGOING WEBHOOKS
    if (
      controls.outgoing_webhooks_enabled &&
      controls.webhook_url &&
      Array.isArray(controls.webhook_events) &&
      controls.webhook_events.includes(eventType)
    ) {
      fetch(controls.webhook_url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Prisma-Player-Webhooks/1.0",
        },
        body: JSON.stringify({
          id: randomUUID(),
          event: `vsl.${eventType}`,
          video_id: videoId,
          session_id: sessionId,
          progress_percent: progressPercent,
          watched_seconds: watchedSeconds,
          country_code: country,
          device_type: deviceType,
          os_name: osName,
          browser_name: browserName,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }

    // 2. CONVERSION DROP ALERTS
    if (controls.conversion_alerts_enabled) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ count: playsCount }, { count: conversionsCount }] = await Promise.all([
        supabase.from("video_events")
          .select("session_id", { count: "exact", head: true })
          .eq("video_id", videoId)
          .eq("event_type", "play")
          .gt("created_at", oneDayAgo),
        supabase.from("video_events")
          .select("session_id", { count: "exact", head: true })
          .eq("video_id", videoId)
          .eq("event_type", "conversion")
          .gt("created_at", oneDayAgo),
      ]);

      const plays = playsCount || 0;
      const conversions = conversionsCount || 0;

      if (plays >= 10) { // Only notify when there is a significant baseline
        const conversionRate = (conversions / plays) * 100;
        if (conversionRate < controls.conversion_drop_threshold) {
          // Check if we already alerted the user for this video in the last 24 hours
          const { data: existingAlert } = await supabase.from("user_inbox")
            .select("id")
            .eq("user_id", userId)
            .eq("kind", "system")
            .eq("action_url", `/dashboard/analytics/${videoId}`)
            .gt("created_at", oneDayAgo)
            .maybeSingle();

          if (!existingAlert) {
            await supabase.from("user_inbox").insert({
              user_id: userId,
              kind: "system",
              title: "Alerta de Queda de Conversão!",
              message: `A taxa de conversão da VSL nas últimas 24h está em ${conversionRate.toFixed(1)}%, ficando abaixo do seu limite configurado de ${controls.conversion_drop_threshold}%.`,
              action_label: "Ver Analytics",
              action_url: `/dashboard/analytics/${videoId}`,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing VSL intelligence:", error);
  }
}

