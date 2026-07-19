import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csrfGuard } from "@/lib/security/csrf";
import { deliverWebhook, validateWebhookUrl } from "@/lib/webhooks/delivery";

const frequencies = new Set(["daily", "weekly", "monthly"]);
const thresholds = new Set([25, 50, 75, 90, 100]);
const webhookEvents = new Set(["impression", "play", "progress", "cta_click", "conversion", "complete"]);

async function context(userId: string) {
  const admin = createAdminClient();
  const result = await admin.from("subscriptions").select("plan:billing_plans(automatic_reports,audience_sync,outgoing_webhooks,private_benchmark,portfolio_comparison,conversion_drop_alerts)").eq("user_id", userId).eq("status", "active").maybeSingle();
  const plan = Array.isArray(result.data?.plan) ? result.data.plan[0] : result.data?.plan;
  return { admin, plan };
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { admin, plan } = await context(userId);
  await admin.from("intelligence_controls").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data, error } = await admin.from("intelligence_controls").select("automatic_reports_enabled,report_frequency,report_email,audience_sync_enabled,audience_retention_threshold,outgoing_webhooks_enabled,webhook_url,webhook_events,conversion_alerts_enabled,conversion_drop_threshold,alert_webhook_enabled,alert_webhook_url,updated_at").eq("user_id", userId).single();
  if (error) return NextResponse.json({ error: "controls_unavailable" }, { status: 503 });
  return NextResponse.json({ controls: data, capabilities: plan ?? { automatic_reports: true, audience_sync: true, outgoing_webhooks: true, private_benchmark: true, portfolio_comparison: true, conversion_drop_alerts: true } }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const csrf = csrfGuard(request); if (csrf) return csrf;
  const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { admin } = await context(userId);
  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if ("automaticReportsEnabled" in body) update.automatic_reports_enabled = Boolean(body.automaticReportsEnabled);
  if (frequencies.has(String(body.reportFrequency))) update.report_frequency = String(body.reportFrequency);
  if ("reportEmail" in body) { const email = String(body.reportEmail ?? "").trim().toLowerCase(); if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 }); update.report_email = email || null; }
  if ("audienceSyncEnabled" in body) update.audience_sync_enabled = Boolean(body.audienceSyncEnabled);
  if (thresholds.has(Number(body.audienceRetentionThreshold))) update.audience_retention_threshold = Number(body.audienceRetentionThreshold);
  if ("outgoingWebhooksEnabled" in body) update.outgoing_webhooks_enabled = Boolean(body.outgoingWebhooksEnabled);
  if ("webhookUrl" in body) { const value = String(body.webhookUrl ?? "").trim(); if (value) { try { await validateWebhookUrl(value); } catch { return NextResponse.json({ error: "invalid_webhook_url" }, { status: 400 }); } } update.webhook_url = value || null; }
  if (Array.isArray(body.webhookEvents)) update.webhook_events = body.webhookEvents.map(String).filter((item) => webhookEvents.has(item)).slice(0, 6);
  if ("conversionAlertsEnabled" in body) update.conversion_alerts_enabled = Boolean(body.conversionAlertsEnabled);
  if (Number.isInteger(Number(body.conversionDropThreshold)) && Number(body.conversionDropThreshold) >= 5 && Number(body.conversionDropThreshold) <= 90) update.conversion_drop_threshold = Number(body.conversionDropThreshold);
  if ("alertWebhookEnabled" in body) update.alert_webhook_enabled = Boolean(body.alertWebhookEnabled);
  if ("alertWebhookUrl" in body) { const value = String(body.alertWebhookUrl ?? "").trim(); if (value) { try { await validateWebhookUrl(value); } catch { return NextResponse.json({ error: "invalid_alert_webhook_url" }, { status: 400 }); } } update.alert_webhook_url = value || null; }
  const { error } = await admin.from("intelligence_controls").upsert(update, { onConflict: "user_id" });
  return error ? NextResponse.json({ error: "controls_save_failed" }, { status: 500 }) : NextResponse.json({ saved: true });
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request); if (csrf) return csrf;
  const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; target?: string } | null;
  if (body?.action !== "test_webhook") return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  const { admin } = await context(userId);
  const { data } = await admin.from("intelligence_controls").select("webhook_url,alert_webhook_url").eq("user_id", userId).maybeSingle();
  const url = body.target === "alert" ? data?.alert_webhook_url : data?.webhook_url;
  if (!url) return NextResponse.json({ error: "no_webhook_url_configured" }, { status: 400 });
  try {
    const delivered = await deliverWebhook(url, { id: randomUUID(), event: body.target === "alert" ? "conversion_drop" : "prisma.webhook.test", timestamp: new Date().toISOString(), data: body.target === "alert" ? { video_title: "VSL de teste", previous_rate: 4.2, current_rate: 2.8, drop_percent: 33.3 } : { video_id: "test", progress_percent: 75, country_code: "BR", device_type: "mobile" } });
    return NextResponse.json({ delivered: true, ...delivered });
  } catch (error) { return NextResponse.json({ error: "webhook_delivery_failed", message: error instanceof Error ? error.message : "delivery_failed" }, { status: 502 }); }
}
