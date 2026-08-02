import { after, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/security/csrf";
import { domainAllowed, normalizeHost, verifyEmbedEventToken } from "@/lib/security/embed-origin";
import { deliverWebhook } from "@/lib/webhooks/delivery";
import { readJsonBody } from "@/lib/api/request";
import { getAccountPlan } from "@/lib/access/service";
import { ANALYTICS } from "@/lib/constants";
import { pixelIntegrations } from "@/lib/player/pixels";
import { deliverServerPurchase } from "@/services/ads/server-events";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const events = new Set(["heartbeat", "impression", "play", "progress", "complete", "cta_click", "conversion"]);
const milestones = new Set([0, 10, 25, 50, 75, 90, 100]);

function clientContext(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : ua ? "desktop" : "other";
  const os = /windows/i.test(ua) ? "Windows" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os|macintosh/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /firefox\//i.test(ua) ? "Firefox" : /chrome\//i.test(ua) ? "Chrome" : /safari\//i.test(ua) ? "Safari" : "Other";
  return { device, os, browser, ua };
}

function pageContext(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return { pageUrl: null, params: new URLSearchParams(), source: "Direto" };
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    url.hash = "";
    return { pageUrl: url.toString().slice(0, 1000), params: url.searchParams, source: url.hostname.replace(/^www\./, "").slice(0, 120) || "Direto" };
  } catch { return { pageUrl: null, params: new URLSearchParams(), source: "Direto" }; }
}

function first(params: URLSearchParams, names: string[]) {
  for (const name of names) { const value = params.get(name)?.trim(); if (value) return value.slice(0, 160); }
  return null;
}

export async function POST(request: Request) {
  const firstPartyOrigin = validateOrigin(request);
  // Mede os bytes reais: só o header `content-length` deixava passar qualquer
  // cliente que usasse `Transfer-Encoding: chunked`.
  const parsed = await readJsonBody<Record<string, unknown>>(request, ANALYTICS.MAX_EVENT_PAYLOAD_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const videoId = String(body?.videoId ?? "");
  const sessionId = String(body?.sessionId ?? "");
  const eventType = String(body?.eventType ?? "");
  const progressPercent = Math.round(Number(body?.progressPercent ?? 0));
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim().slice(0, 120) : "";
  const conversionValue = Number(body?.value);
  const currency = typeof body?.currency === "string" ? body.currency.toUpperCase() : "";
  if (!uuid.test(videoId) || !uuid.test(sessionId) || !events.has(eventType) || (eventType !== "heartbeat" && !milestones.has(progressPercent)) || progressPercent < 0 || progressPercent > 100) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  if (eventType === "conversion" && (!transactionId || !Number.isFinite(conversionValue) || conversionValue < 0 || conversionValue > 1_000_000_000 || !/^[A-Z]{3}$/.test(currency))) return NextResponse.json({ error: "invalid_conversion" }, { status: 400 });
  if (!firstPartyOrigin && eventType !== "conversion") return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  // Proves the event came from a real embed load that already cleared the
  // player's domain and traffic rules, instead of anyone who knows the UUID.
  if (!verifyEmbedEventToken(typeof body?.eventToken === "string" ? body.eventToken : null, videoId)) return NextResponse.json({ error: "invalid_event_token" }, { status: 403 });
  const limited = await rateLimit(request, `analytics:${videoId}:${sessionId}`, { max: eventType === "heartbeat" ? 120 : ANALYTICS.RATE_LIMIT_MAX_REQUESTS, windowMs: ANALYTICS.RATE_LIMIT_WINDOW_MS });
  if (limited) return limited;

  const supabase = createAdminClient();
  const [{ data: video }, { data: player }] = await Promise.all([
    supabase.from("videos").select("id,user_id,status,title").eq("id", videoId).maybeSingle(),
    supabase.from("player_configs").select("id,allowed_domains,config").eq("video_id", videoId).eq("published", true).maybeSingle(),
  ]);
  if (!video || video.status !== "ready") return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  if (!player) return NextResponse.json({ error: "player_not_published" }, { status: 409 });
  const requestOrigin = request.headers.get("origin") ?? "";
  if (!firstPartyOrigin) {
    const originHost = normalizeHost(requestOrigin);
    const allowedDomains = Array.isArray(player.allowed_domains) ? player.allowed_domains.filter((item): item is string => typeof item === "string") : [];
    if (!originHost || !domainAllowed(originHost, allowedDomains)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const context = clientContext(request);
  const country = (request.headers.get("x-vercel-ip-country") ?? "XX").toUpperCase().slice(0, 2);
  const page = pageContext(body?.pageUrl ?? body?.referrer);
  const watchedSeconds = Math.max(0, Math.min(Number(body?.watchedSeconds ?? 0) || 0, 86400));

  const { error: liveError } = await supabase.from("video_live_sessions").upsert({ video_id: video.id, user_id: video.user_id, session_id: sessionId, country_code: country.length === 2 ? country : "XX", device_type: context.device, progress_percent: progressPercent, last_seen_at: new Date().toISOString() }, { onConflict: "video_id,session_id" });
  if (eventType === "heartbeat") return liveError ? NextResponse.json({ error: "heartbeat_write_failed" }, { status: 500 }) : new NextResponse(null, { status: 204 });

  const riskReasons: string[] = [];
  if (!context.ua) riskReasons.push("missing_user_agent");
  if (/bot|crawler|spider|headless|curl|wget|python|scrapy|phantom/i.test(context.ua)) riskReasons.push("automation_user_agent");
  if (eventType === "complete" && watchedSeconds < 3) riskReasons.push("impossible_completion");
  const riskScore = Math.min(100, riskReasons.reduce((score, reason) => score + (reason === "missing_user_agent" ? 25 : 50), 0));
  const { data: writtenEvent, error } = await supabase.from("video_events").upsert({
    user_id: video.user_id, video_id: video.id, session_id: sessionId, event_type: eventType, progress_percent: progressPercent, watched_seconds: watchedSeconds,
    country_code: country.length === 2 ? country : "XX", device_type: context.device, os_name: context.os, browser_name: context.browser, traffic_source: page.source,
    page_url: page.pageUrl, campaign_id: first(page.params, ["campaign_id", "fb_campaign_id", "utm_campaign"]), creative_id: first(page.params, ["creative_id", "adset_id", "utm_content"]),
    ad_id: first(page.params, ["ad_id", "fb_ad_id"]), utm_source: first(page.params, ["utm_source"]), utm_medium: first(page.params, ["utm_medium"]), utm_campaign: first(page.params, ["utm_campaign"]), risk_score: riskScore, risk_reasons: riskReasons,
    transaction_id: eventType === "conversion" ? transactionId : null, conversion_value: eventType === "conversion" ? conversionValue : null, currency: eventType === "conversion" ? currency : null, advertising_consent: body?.advertisingConsent === true,
  }, { onConflict: "video_id,session_id,event_type,progress_percent", ignoreDuplicates: true }).select("id").maybeSingle();

  // `ignoreDuplicates` can legitimately return no row. Only the request that
  // actually persisted the event may trigger webhooks or server-side pixels.
  // The partial transaction index also closes races between different sessions.
  if (!error && writtenEvent) after(async () => {
    const [{ data: controls }, plan] = await Promise.all([
      supabase.from("intelligence_controls").select("outgoing_webhooks_enabled,webhook_url,webhook_events").eq("user_id", video.user_id).maybeSingle(),
      getAccountPlan(video.user_id),
    ]);
    if (eventType === "conversion" && body?.advertisingConsent === true) {
      await deliverServerPurchase({
        integrations: pixelIntegrations((player.config && typeof player.config === "object" ? player.config : {}) as Record<string, unknown>),
        eventId: transactionId,
        eventName: "Purchase",
        eventSourceUrl: page.pageUrl,
        value: conversionValue,
        currency,
        clientUserAgent: context.ua,
        clientIp: request.headers.get("x-forwarded-for"),
      }).catch(() => undefined);
    }
    // Webhook de saída é recurso de plano superior: a checagem existia apenas na
    // tela, então quem tivesse ativado a chave uma vez continuava recebendo.
    if (!plan.capabilities.outgoing_webhooks) return;
    if (controls?.outgoing_webhooks_enabled && controls.webhook_url && Array.isArray(controls.webhook_events) && controls.webhook_events.includes(eventType)) {
      await deliverWebhook(controls.webhook_url, { id: randomUUID(), event: `vsl.${eventType}`, timestamp: new Date().toISOString(), data: { video_id: video.id, video_title: video.title, session_id: sessionId, progress_percent: progressPercent, watched_seconds: watchedSeconds, country_code: country, device_type: context.device } }).catch(() => undefined);
    }
  });
  if (error && error.code !== "23505") return NextResponse.json({ error: "event_write_failed" }, { status: 500 });
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store", ...(requestOrigin ? { "access-control-allow-origin": requestOrigin, vary: "Origin" } : {}) } });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new NextResponse(null, { status: 204, headers: {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  } });
}
