import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverWebhook } from "@/lib/webhooks/delivery";
import { sendOperationalReport } from "@/lib/email/operational-report";

function authorized(request: Request, secret: string) {
  const value = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function due(last: string | null, frequency: string) {
  const hours = frequency === "daily" ? 24 : frequency === "weekly" ? 168 : 720;
  return !last || Date.now() - new Date(last).getTime() >= hours * 3_600_000;
}

async function counts(admin: ReturnType<typeof createAdminClient>, videoIds: string[], from: string, to?: string) {
  const get = async (eventType: string) => {
    let query = admin.from("video_events").select("session_id", { count: "exact", head: true }).in("video_id", videoIds).eq("event_type", eventType).gte("created_at", from);
    if (to) query = query.lt("created_at", to);
    const { count } = await query;
    return count ?? 0;
  };
  const [plays, conversions] = await Promise.all([get("play"), get("conversion")]);
  return { plays, conversions, rate: plays ? conversions / plays * 100 : 0 };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: configs, error } = await admin.from("intelligence_controls").select("user_id,automatic_reports_enabled,report_frequency,report_email,last_report_sent_at,conversion_alerts_enabled,conversion_drop_threshold,alert_webhook_enabled,alert_webhook_url");
  if (error) return NextResponse.json({ error: "controls_unavailable" }, { status: 503 });
  const result = { reports: 0, emails: 0, alerts: 0, webhooks: 0, errors: [] as string[] };
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const previousFrom = new Date(now.getTime() - 48 * 3_600_000).toISOString();

  for (const config of configs ?? []) {
    try {
      const { data: videos } = await admin.from("videos").select("id,title").eq("user_id", config.user_id).eq("status", "ready");
      if (!videos?.length) continue;
      const ids = videos.map((video) => video.id);
      if (config.automatic_reports_enabled && config.report_email && due(config.last_report_sent_at, config.report_frequency)) {
        const days = config.report_frequency === "daily" ? 1 : config.report_frequency === "weekly" ? 7 : 30;
        const stats = await counts(admin, ids, new Date(now.getTime() - days * 86_400_000).toISOString());
        const mail = await sendOperationalReport({ to: config.report_email, frequency: config.report_frequency, days, plays: stats.plays, conversions: stats.conversions, conversionRate: stats.rate });
        await admin.from("user_inbox").insert({ user_id: config.user_id, kind: "system", title: "Seu relatório está pronto", message: `${stats.plays} plays e ${stats.conversions} conversões, com taxa de ${stats.rate.toFixed(1)}% nos últimos ${days} dias.${mail.sent ? " Uma cópia também foi enviada ao seu e-mail." : " Você pode consultar o relatório completo por aqui."}`, action_label: "Abrir relatório", action_url: "/dashboard/intelligence" });
        await admin.from("intelligence_controls").update({ last_report_sent_at: now.toISOString(), updated_at: now.toISOString() }).eq("user_id", config.user_id);
        result.reports += 1; if (mail.sent) result.emails += 1;
      }

      if (config.conversion_alerts_enabled) {
        for (const video of videos) {
          const [current, previous] = await Promise.all([counts(admin, [video.id], currentFrom), counts(admin, [video.id], previousFrom, currentFrom)]);
          if (current.plays < 10 || previous.plays < 10 || previous.rate <= 0) continue;
          const dropPercent = (previous.rate - current.rate) / previous.rate * 100;
          if (dropPercent < config.conversion_drop_threshold) continue;
          const actionUrl = `/dashboard/analytics/${video.id}`;
          const { data: existing } = await admin.from("user_inbox").select("id").eq("user_id", config.user_id).eq("action_url", actionUrl).eq("kind", "alert").gte("created_at", currentFrom).limit(1);
          if (existing?.length) continue;
          await admin.from("user_inbox").insert({ user_id: config.user_id, kind: "alert", title: `Queda de conversão: ${video.title}`, message: `A taxa caiu ${dropPercent.toFixed(1)}%: de ${previous.rate.toFixed(1)}% no período anterior para ${current.rate.toFixed(1)}% nas últimas 24h.`, action_label: "Analisar métricas", action_url: actionUrl });
          result.alerts += 1;
          if (config.alert_webhook_enabled && config.alert_webhook_url) {
            await deliverWebhook(config.alert_webhook_url, { id: randomUUID(), event: "conversion_drop", timestamp: now.toISOString(), data: { video_id: video.id, video_title: video.title, previous_rate: Number(previous.rate.toFixed(2)), current_rate: Number(current.rate.toFixed(2)), drop_percent: Number(dropPercent.toFixed(2)), previous_plays: previous.plays, current_plays: current.plays } });
            result.webhooks += 1;
          }
        }
      }
    } catch (reason) { result.errors.push(reason instanceof Error ? reason.message : "unknown_error"); }
  }
  await admin.from("video_live_sessions").delete().lt("last_seen_at", new Date(Date.now() - 10 * 60_000).toISOString());
  return NextResponse.json({ success: result.errors.length === 0, result });
}
