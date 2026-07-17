import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

type EventRow = { session_id: string; event_type: string; progress_percent: number; watched_seconds: number; country_code: string; device_type: string; os_name: string; browser_name: string; traffic_source: string; campaign_id: string | null; creative_id: string | null; ad_id: string | null; risk_score: number; created_at: string };

function pct(value: number, total: number) { return total ? Math.round(value / total * 1000) / 10 : 0; }
function unique(rows: EventRow[]) { return new Set(rows.map((row) => row.session_id)).size; }
function dimension(rows: EventRow[], key: keyof EventRow) {
  const groups = new Map<string, EventRow[]>();
  rows.forEach((row) => { const name = String(row[key] || "Desconhecido"); groups.set(name, [...(groups.get(name) ?? []), row]); });
  return [...groups].map(([name, values]) => {
    const impressions = unique(values.filter((row) => row.event_type === "impression"));
    const plays = unique(values.filter((row) => row.event_type === "play"));
    const completes = unique(values.filter((row) => row.event_type === "complete"));
    return { name, impressions, plays, playRate: pct(plays, impressions), completes, completionRate: pct(completes, plays) };
  }).sort((a, b) => b.impressions - a.impressions).slice(0, 30);
}

function summarize(rows: EventRow[]) {
  const by = (type: string, progress?: number) => unique(rows.filter((row) => row.event_type === type && (progress === undefined || row.progress_percent === progress)));
  const reached = (point: number) => unique(rows.filter((row) => row.event_type === "complete" || (row.event_type === "progress" && row.progress_percent >= point)));
  const impressions = by("impression"), plays = by("play"), completed = by("complete");
  return { impressions, uniqueViews: impressions, plays, playRate: pct(plays, impressions), reached25: reached(25), reached50: reached(50), reached75: reached(75), reached90: reached(90), completed, completionRate: pct(completed, plays), ctaClicks: by("cta_click"), conversions: by("conversion") };
}

export async function GET(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { videoId } = await context.params;
  const supabase = await createClient();
  const { data: video } = await supabase.from("videos").select("id,title,duration_seconds,created_at").eq("id", videoId).eq("user_id", userId).maybeSingle();
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const range = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30), 1), 3650);
  const now = Date.now(), since = new Date(now - range * 86400000).toISOString(), previousSince = new Date(now - range * 2 * 86400000).toISOString();
  const { data, error } = await supabase.from("video_events").select("session_id,event_type,progress_percent,watched_seconds,country_code,device_type,os_name,browser_name,traffic_source,campaign_id,creative_id,ad_id,risk_score,created_at").eq("video_id", videoId).gte("created_at", previousSince).order("created_at", { ascending: true }).limit(50000);
  if (error) return NextResponse.json({ error: "analytics_load_failed" }, { status: 500 });
  const allRows = (data ?? []) as EventRow[];
  const rows = allRows.filter((row) => row.created_at >= since);
  const previousRows = allRows.filter((row) => row.created_at < since);
  const by = (type: string, progress?: number) => unique(rows.filter((row) => row.event_type === type && (progress === undefined || row.progress_percent === progress)));
  const impressions = by("impression"), plays = by("play"), completed = by("complete");
  const reached = (point: number) => unique(rows.filter((row) => row.event_type === "complete" || (row.event_type === "progress" && row.progress_percent >= point)));
  const summary = summarize(rows), previous = summarize(previousRows);
  const delta = (current: number, before: number) => before ? Math.round((current - before) / before * 1000) / 10 : current ? 100 : 0;
  const comparison = { previous, delta: { impressions: delta(summary.impressions, previous.impressions), plays: delta(summary.plays, previous.plays), playRate: Math.round((summary.playRate - previous.playRate) * 10) / 10, completionRate: Math.round((summary.completionRate - previous.completionRate) * 10) / 10, conversions: delta(summary.conversions, previous.conversions) } };
  const funnel = [{ name: "Visualizações", value: impressions }, { name: "Plays", value: plays }, { name: "Assistiu 25%", value: summary.reached25 }, { name: "Assistiu 50%", value: summary.reached50 }, { name: "Assistiu 75%", value: summary.reached75 }, { name: "Concluiu", value: completed }];
  const retention = [0, 10, 25, 50, 75, 90, 100].map((point) => ({ point, viewers: point === 0 ? plays : point === 100 ? completed : reached(point), rate: pct(point === 0 ? plays : point === 100 ? completed : reached(point), plays) }));
  const insights: { tone: string; title: string; detail: string }[] = [];
  if (impressions < 10) insights.push({ tone: "info", title: "Colete mais tráfego", detail: "Ainda há poucos acessos para tirar conclusões seguras. Compartilhe o embed e volte após pelo menos 30 visualizações." });
  else if (summary.playRate < 35) insights.push({ tone: "warning", title: "A abertura está perdendo cliques", detail: "Teste uma thumbnail, headline e Smart Autoplay mais claros. Sua Play Rate está abaixo de 35%." });
  if (plays >= 10 && pct(summary.reached25, plays) < 55) insights.push({ tone: "warning", title: "Queda forte no começo", detail: "Encurte a introdução e antecipe a promessa principal antes dos primeiros 25% do vídeo." });
  if (plays >= 10 && pct(summary.reached75, plays) < 35) insights.push({ tone: "tip", title: "Há espaço para um Mini-Gancho", detail: "A retenção cai antes da oferta. Use um gancho de curiosidade entre 50% e 75% e compare o resultado." });
  if (plays >= 10 && summary.completionRate >= 40) insights.push({ tone: "success", title: "Boa retenção final", detail: "A audiência que inicia permanece até o fim. Foque agora em CTA e taxa de conversão." });
  const liveSince = Date.now() - 2 * 60000;
  const liveRows = rows.filter((row) => new Date(row.created_at).getTime() >= liveSince);
  const live = new Set(liveRows.map((row) => row.session_id)).size;
  const liveCountries = dimension(liveRows, "country_code");
  const suspiciousSessions = new Set(rows.filter((row) => row.risk_score >= 50).map((row) => row.session_id)).size;
  const attentionMap = retention.slice(1).map((point, index, list) => ({ ...point, drop: index ? Math.max(0, Math.round((list[index - 1].rate - point.rate) * 10) / 10) : Math.max(0, 100 - point.rate) }));
  return NextResponse.json({ video, range, summary, comparison, retention, attentionMap, funnel, fraud: { suspiciousSessions, suspiciousRate: pct(suspiciousSessions, impressions), cleanSessions: Math.max(0, impressions - suspiciousSessions) }, dimensions: { countries: dimension(rows, "country_code"), devices: dimension(rows, "device_type"), operatingSystems: dimension(rows, "os_name"), browsers: dimension(rows, "browser_name"), traffic: dimension(rows, "traffic_source"), campaigns: dimension(rows, "campaign_id"), creatives: dimension(rows, "creative_id"), ads: dimension(rows, "ad_id") }, insights, live, liveCountries });
}
