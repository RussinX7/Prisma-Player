import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csrfGuard } from "@/lib/security/csrf";

const frequencies = new Set(["daily", "weekly", "monthly"]);
const providers = new Set(["meta", "google", "tiktok", "kwai"]);
const thresholds = new Set([25, 50, 75, 90, 100]);
const webhookEvents = new Set(["impression", "play", "progress", "cta_click", "conversion", "complete"]);

async function planContext(userId: string) {
  const admin = createAdminClient();
  const result = await admin.from("subscriptions")
    .select("plan:billing_plans(automatic_reports,audience_sync,outgoing_webhooks,private_benchmark,portfolio_comparison,conversion_drop_alerts)")
    .eq("user_id", userId).eq("status", "active").maybeSingle();
  const plan = Array.isArray(result.data?.plan) ? result.data.plan[0] : result.data?.plan;
  return { admin, plan };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, plan } = await planContext(userId);
  await admin.from("intelligence_controls").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data, error } = await admin.from("intelligence_controls")
    .select("automatic_reports_enabled,report_frequency,report_email,audience_sync_enabled,audience_provider,audience_retention_threshold,outgoing_webhooks_enabled,webhook_url,webhook_events,conversion_alerts_enabled,conversion_drop_threshold,updated_at")
    .eq("user_id", userId).single();
  if (error) return NextResponse.json({ error: "controls_unavailable" }, { status: 503 });
  // If no active subscription found, grant all capabilities as true (free tier / admin)
  const capabilities = plan ?? {
    automatic_reports: true,
    audience_sync: true,
    outgoing_webhooks: true,
    private_benchmark: true,
    portfolio_comparison: true,
    conversion_drop_alerts: true,
  };
  return NextResponse.json({ controls: data, capabilities }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { admin } = await planContext(userId);
  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  if ("automaticReportsEnabled" in body || "reportFrequency" in body || "reportEmail" in body) {
    if ("automaticReportsEnabled" in body) update.automatic_reports_enabled = Boolean(body.automaticReportsEnabled);
    if ("reportFrequency" in body && frequencies.has(String(body.reportFrequency))) update.report_frequency = String(body.reportFrequency);
    if ("reportEmail" in body) {
      const email = String(body.reportEmail ?? "").trim().toLowerCase();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
      update.report_email = email || null;
    }
  }
  if ("audienceSyncEnabled" in body || "audienceProvider" in body || "audienceRetentionThreshold" in body) {
    if ("audienceSyncEnabled" in body) update.audience_sync_enabled = Boolean(body.audienceSyncEnabled);
    if ("audienceProvider" in body && providers.has(String(body.audienceProvider))) update.audience_provider = String(body.audienceProvider);
    const threshold = Number(body.audienceRetentionThreshold);
    if ("audienceRetentionThreshold" in body && thresholds.has(threshold)) update.audience_retention_threshold = threshold;
  }
  if ("outgoingWebhooksEnabled" in body || "webhookUrl" in body || "webhookEvents" in body) {
    if ("outgoingWebhooksEnabled" in body) update.outgoing_webhooks_enabled = Boolean(body.outgoingWebhooksEnabled);
    if ("webhookUrl" in body) {
      const url = String(body.webhookUrl ?? "").trim();
      if (url && !isSafeWebhookSyntax(url)) return NextResponse.json({ error: "invalid_webhook_url" }, { status: 400 });
      update.webhook_url = url || null;
    }
    if (Array.isArray(body.webhookEvents)) update.webhook_events = body.webhookEvents.map(String).filter((item) => webhookEvents.has(item)).slice(0, 6);
  }
  if ("conversionAlertsEnabled" in body || "conversionDropThreshold" in body) {
    if ("conversionAlertsEnabled" in body) update.conversion_alerts_enabled = Boolean(body.conversionAlertsEnabled);
    const threshold = Number(body.conversionDropThreshold);
    if ("conversionDropThreshold" in body && Number.isInteger(threshold) && threshold >= 5 && threshold <= 90) update.conversion_drop_threshold = threshold;
  }
  const { error } = await admin.from("intelligence_controls").upsert(update, { onConflict: "user_id" });
  return error ? NextResponse.json({ error: "controls_save_failed" }, { status: 500 }) : NextResponse.json({ saved: true });
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string } | null;

  // --- ACTION: test_webhook ---
  if (body?.action === "test_webhook") {
    const { admin } = await planContext(userId);
    const { data } = await admin.from("intelligence_controls").select("webhook_url").eq("user_id", userId).maybeSingle();
    if (!data?.webhook_url) return NextResponse.json({ error: "no_webhook_url_configured", message: "Configure uma URL de webhook HTTPS antes de testar." }, { status: 400 });
    if (!isSafeWebhookSyntax(data.webhook_url)) return NextResponse.json({ error: "invalid_webhook_url", message: "A URL precisa ser HTTPS, sem porta ou credenciais." }, { status: 400 });
    // Skip DNS/private-IP check on serverless (Vercel) — just validate syntax and protocol
    try {
      const response = await fetch(data.webhook_url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Prisma-Player-Webhooks/1.0" },
        body: JSON.stringify({
          id: randomUUID(),
          event: "prisma.webhook.test",
          video_id: "test-video-id",
          session_id: "test-session-id",
          progress_percent: 75,
          watched_seconds: 42,
          country_code: "BR",
          device_type: "mobile",
          os_name: "iOS",
          browser_name: "Safari",
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        return NextResponse.json({ delivered: true, status: response.status });
      }
      return NextResponse.json({ delivered: false, status: response.status, message: `O endpoint retornou ${response.status}. Verifique se o servidor aceita POST com JSON.` }, { status: 502 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "timeout ou conexão recusada";
      return NextResponse.json({ error: "webhook_delivery_failed", message: `Falha na entrega: ${msg}. Verifique se a URL está online e aceita HTTPS.` }, { status: 502 });
    }
  }

  // --- ACTION: export_audience ---
  if (body?.action === "export_audience") {
    const { admin } = await planContext(userId);
    const { data: videos } = await admin.from("videos").select("id,title").eq("user_id", userId).eq("status", "ready");
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "no_videos", message: "Publique VSLs primeiro para gerar dados de audiência." }, { status: 400 });
    }

    const videoIds = videos.map(v => v.id);

    // Fetch all events for user videos
    const { data: events } = await admin.from("video_events")
      .select("session_id,video_id,event_type,progress_percent,watched_seconds,country_code,device_type,os_name,browser_name")
      .in("video_id", videoIds)
      .order("created_at", { ascending: false })
      .limit(50000);

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "no_events", message: "Nenhum evento registrado ainda para suas VSLs." }, { status: 400 });
    }

    // Group events by session to build audience profile
    const sessions = new Map<string, {
      session_id: string;
      video_title: string;
      country: string;
      device: string;
      os: string;
      browser: string;
      max_progress: number;
      watched_seconds: number;
      played: boolean;
      converted: boolean;
      completed: boolean;
      clicked_cta: boolean;
    }>();

    for (const ev of events) {
      const key = ev.session_id;
      const existing = sessions.get(key);
      const videoTitle = videos.find(v => v.id === ev.video_id)?.title ?? "VSL";

      if (!existing) {
        sessions.set(key, {
          session_id: ev.session_id,
          video_title: videoTitle,
          country: ev.country_code ?? "XX",
          device: ev.device_type ?? "other",
          os: ev.os_name ?? "Other",
          browser: ev.browser_name ?? "Other",
          max_progress: ev.progress_percent ?? 0,
          watched_seconds: ev.watched_seconds ?? 0,
          played: ev.event_type === "play",
          converted: ev.event_type === "conversion",
          completed: ev.event_type === "complete",
          clicked_cta: ev.event_type === "cta_click",
        });
      } else {
        existing.max_progress = Math.max(existing.max_progress, ev.progress_percent ?? 0);
        existing.watched_seconds = Math.max(existing.watched_seconds, ev.watched_seconds ?? 0);
        if (ev.event_type === "play") existing.played = true;
        if (ev.event_type === "conversion") existing.converted = true;
        if (ev.event_type === "complete") existing.completed = true;
        if (ev.event_type === "cta_click") existing.clicked_cta = true;
      }
    }

    // Build audience segments
    const allSessions = Array.from(sessions.values());
    const totalSessions = allSessions.length;
    const buyers = allSessions.filter(s => s.converted);
    const completers = allSessions.filter(s => s.completed);
    const engagers = allSessions.filter(s => s.max_progress >= 75);
    const clickers = allSessions.filter(s => s.clicked_cta);

    function topSegments(sessions: typeof allSessions, key: "country" | "device" | "os" | "browser") {
      const counts = new Map<string, number>();
      for (const s of sessions) {
        counts.set(s[key], (counts.get(s[key]) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
          name,
          count,
          percentage: sessions.length > 0 ? Math.round((count / sessions.length) * 1000) / 10 : 0
        }));
    }

    const audienceProfile = {
      total_sessions: totalSessions,
      total_buyers: buyers.length,
      total_completers: completers.length,
      total_engagers: engagers.length,
      total_cta_clickers: clickers.length,
      conversion_rate: totalSessions > 0 ? Math.round((buyers.length / totalSessions) * 1000) / 10 : 0,
      completion_rate: totalSessions > 0 ? Math.round((completers.length / totalSessions) * 1000) / 10 : 0,
      segments: {
        all: {
          top_countries: topSegments(allSessions, "country"),
          top_devices: topSegments(allSessions, "device"),
          top_os: topSegments(allSessions, "os"),
          top_browsers: topSegments(allSessions, "browser"),
        },
        buyers: {
          top_countries: topSegments(buyers, "country"),
          top_devices: topSegments(buyers, "device"),
          top_os: topSegments(buyers, "os"),
          top_browsers: topSegments(buyers, "browser"),
        },
        completers: {
          top_countries: topSegments(completers, "country"),
          top_devices: topSegments(completers, "device"),
          top_os: topSegments(completers, "os"),
          top_browsers: topSegments(completers, "browser"),
        },
        engagers_75: {
          top_countries: topSegments(engagers, "country"),
          top_devices: topSegments(engagers, "device"),
          top_os: topSegments(engagers, "os"),
          top_browsers: topSegments(engagers, "browser"),
        },
      },
      // CSV-ready rows for export to ad platforms
      csv_rows: allSessions.map(s => ({
        session_id: s.session_id,
        video: s.video_title,
        country: s.country,
        device: s.device,
        os: s.os,
        browser: s.browser,
        max_progress: s.max_progress,
        watched_seconds: s.watched_seconds,
        played: s.played ? "Sim" : "Não",
        completed: s.completed ? "Sim" : "Não",
        clicked_cta: s.clicked_cta ? "Sim" : "Não",
        converted: s.converted ? "Sim" : "Não",
      })),
    };

    return NextResponse.json(audienceProfile, { headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

function isSafeWebhookSyntax(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && url.port === ""; } catch { return false; }
}
