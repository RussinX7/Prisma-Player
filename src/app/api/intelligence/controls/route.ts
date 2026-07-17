import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  return NextResponse.json({ controls: data, capabilities: plan ?? {} }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { admin, plan } = await planContext(userId);
  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  if ("automaticReportsEnabled" in body || "reportFrequency" in body || "reportEmail" in body) {
    if (!plan?.automatic_reports) return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
    if ("automaticReportsEnabled" in body) update.automatic_reports_enabled = Boolean(body.automaticReportsEnabled);
    if ("reportFrequency" in body && frequencies.has(String(body.reportFrequency))) update.report_frequency = String(body.reportFrequency);
    if ("reportEmail" in body) {
      const email = String(body.reportEmail ?? "").trim().toLowerCase();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
      update.report_email = email || null;
    }
  }
  if ("audienceSyncEnabled" in body || "audienceProvider" in body || "audienceRetentionThreshold" in body) {
    if (!plan?.audience_sync) return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
    if ("audienceSyncEnabled" in body) update.audience_sync_enabled = Boolean(body.audienceSyncEnabled);
    if ("audienceProvider" in body && providers.has(String(body.audienceProvider))) update.audience_provider = String(body.audienceProvider);
    const threshold = Number(body.audienceRetentionThreshold);
    if ("audienceRetentionThreshold" in body && thresholds.has(threshold)) update.audience_retention_threshold = threshold;
  }
  if ("outgoingWebhooksEnabled" in body || "webhookUrl" in body || "webhookEvents" in body) {
    if (!plan?.outgoing_webhooks) return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
    if ("outgoingWebhooksEnabled" in body) update.outgoing_webhooks_enabled = Boolean(body.outgoingWebhooksEnabled);
    if ("webhookUrl" in body) {
      const url = String(body.webhookUrl ?? "").trim();
      if (url && !isSafeWebhookSyntax(url)) return NextResponse.json({ error: "invalid_webhook_url" }, { status: 400 });
      update.webhook_url = url || null;
    }
    if (Array.isArray(body.webhookEvents)) update.webhook_events = body.webhookEvents.map(String).filter((item) => webhookEvents.has(item)).slice(0, 6);
  }
  if ("conversionAlertsEnabled" in body || "conversionDropThreshold" in body) {
    if (!plan?.conversion_drop_alerts) return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
    if ("conversionAlertsEnabled" in body) update.conversion_alerts_enabled = Boolean(body.conversionAlertsEnabled);
    const threshold = Number(body.conversionDropThreshold);
    if ("conversionDropThreshold" in body && Number.isInteger(threshold) && threshold >= 5 && threshold <= 90) update.conversion_drop_threshold = threshold;
  }
  const { error } = await admin.from("intelligence_controls").upsert(update, { onConflict: "user_id" });
  return error ? NextResponse.json({ error: "controls_save_failed" }, { status: 500 }) : NextResponse.json({ saved: true });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "test_webhook") return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  const { admin, plan } = await planContext(userId);
  if (!plan?.outgoing_webhooks) return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  const { data } = await admin.from("intelligence_controls").select("webhook_url").eq("user_id", userId).maybeSingle();
  if (!data?.webhook_url || !(await isPublicWebhook(data.webhook_url))) return NextResponse.json({ error: "unsafe_webhook_url" }, { status: 400 });
  try {
    const response = await fetch(data.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Prisma-Player-Webhooks/1.0" },
      body: JSON.stringify({ id: randomUUID(), event: "prisma.webhook.test", createdAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    return NextResponse.json({ delivered: response.ok, status: response.status }, { status: response.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "webhook_delivery_failed" }, { status: 502 });
  }
}

function isSafeWebhookSyntax(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && url.port === ""; } catch { return false; }
}

async function isPublicWebhook(value: string) {
  if (!isSafeWebhookSyntax(value)) return false;
  const url = new URL(value);
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) return false;
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
}

function isPrivateAddress(address: string) {
  const normalized = address.replace(/^::ffff:/, "");
  return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd|fe80)/i.test(normalized)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}
