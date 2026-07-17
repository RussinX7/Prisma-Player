import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeWithNvidia } from "@/lib/ai/nvidia";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes = new Set(["performance", "retention", "funnel", "copy", "experiment"]);

function pct(value: number, total: number) { return total ? Math.round(value / total * 1000) / 10 : 0; }

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { videoId?: string; type?: string; days?: number } | null;
  const videoId = String(body?.videoId ?? "");
  const type = String(body?.type ?? "performance");
  const days = Math.min(Math.max(Number(body?.days ?? 30), 1), 365);
  if (!uuid.test(videoId) || !allowedTypes.has(type)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: video }, { data: wallet }] = await Promise.all([
    admin.from("videos").select("id,title,duration_seconds").eq("id", videoId).eq("user_id", userId).maybeSingle(),
    admin.from("ai_credit_wallets").select("balance").eq("user_id", userId).maybeSingle(),
  ]);
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  if (!wallet || wallet.balance < 1) return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: events, error } = await admin.from("video_events")
    .select("session_id,event_type,progress_percent,traffic_source,device_type,country_code,campaign_id,creative_id,risk_score")
    .eq("video_id", videoId).eq("user_id", userId).gte("created_at", since).limit(50000);
  if (error) return NextResponse.json({ error: "metrics_unavailable" }, { status: 500 });

  const rows = events ?? [];
  const sessions = (filter: (row: (typeof rows)[number]) => boolean) => new Set(rows.filter(filter).map((row) => row.session_id)).size;
  const count = (eventType: string) => sessions((row) => row.event_type === eventType);
  const plays = count("play"), impressions = count("impression"), completed = count("complete");
  const reached = (point: number) => sessions((row) => row.event_type === "complete" || (row.event_type === "progress" && row.progress_percent >= point));
  const dimension = (key: "traffic_source" | "device_type" | "country_code" | "campaign_id" | "creative_id") => {
    const values = new Map<string, typeof rows>();
    rows.forEach((row) => { const name = String(row[key] || "Não identificado").slice(0, 120); values.set(name, [...(values.get(name) ?? []), row]); });
    return [...values].map(([name, group]) => {
      const views = new Set(group.filter((row) => row.event_type === "impression").map((row) => row.session_id)).size;
      const starts = new Set(group.filter((row) => row.event_type === "play").map((row) => row.session_id)).size;
      const ends = new Set(group.filter((row) => row.event_type === "complete").map((row) => row.session_id)).size;
      return { name, impressions: views, plays: starts, playRate: pct(starts, views), completes: ends, completionRate: pct(ends, starts) };
    }).sort((a, b) => b.impressions - a.impressions).slice(0, 20);
  };
  const snapshot = {
    video: { id: video.id, title: video.title.slice(0, 200), durationSeconds: video.duration_seconds }, periodDays: days,
    summary: { impressions, plays, playRate: pct(plays, impressions), reached25: reached(25), reached50: reached(50), reached75: reached(75), completed, completionRate: pct(completed, plays), suspiciousSessions: sessions((row) => Number(row.risk_score) >= 60) },
    retention: [0, 10, 25, 50, 75, 90, 100].map((point) => ({ point, viewers: point === 0 ? plays : point === 100 ? completed : reached(point), rate: pct(point === 0 ? plays : point === 100 ? completed : reached(point), plays) })),
    funnel: [{ name: "Impressão", value: impressions }, { name: "Play", value: plays }, { name: "Pitch", value: reached(75) }, { name: "Conclusão", value: completed }],
    dimensions: { traffic: dimension("traffic_source"), devices: dimension("device_type"), countries: dimension("country_code"), campaigns: dimension("campaign_id"), creatives: dimension("creative_id") },
  };
  const { data: job, error: jobError } = await admin.from("ai_analysis_jobs").insert({ user_id: userId, video_id: videoId, analysis_type: type, status: "processing", input_snapshot: snapshot }).select("id").single();
  if (jobError || !job) return NextResponse.json({ error: "analysis_create_failed" }, { status: 500 });
  try {
    const analysis = await analyzeWithNvidia(snapshot);
    const reference = `ai_analysis:${job.id}`;
    const { data: remaining, error: debitError } = await admin.rpc("consume_ai_credit", { p_user_id: userId, p_reference: reference, p_metadata: { analysisId: job.id, videoId } });
    if (debitError || typeof remaining !== "number") throw new Error("credit_debit_failed");
    await admin.from("ai_analysis_jobs").update({ status: "completed", result: analysis.result, model: analysis.model, credits_used: 1, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ id: job.id, result: analysis.result, balance: remaining });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message.slice(0, 80) : "analysis_failed";
    await admin.from("ai_analysis_jobs").update({ status: "failed", error_code: code, completed_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ error: code }, { status: code === "nvidia_not_configured" ? 503 : 502 });
  }
}
