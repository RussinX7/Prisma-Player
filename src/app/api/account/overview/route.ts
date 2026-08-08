import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountAccess } from "@/lib/access/service";
import { BANDWIDTH } from "@/lib/constants";
import {
  bandwidthCostCents,
  estimateEgressBytes,
  summarizeBandwidthByDay,
  trendPercentage,
} from "@/lib/analytics/bandwidth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const [subscription, storage, plays, recentPlays, wallet, videos, access] = await Promise.all([
    admin.from("subscriptions").select("status,current_period_end,billing_method,plan:billing_plans(name,included_plays,storage_gb,prisma_ai_analyses,team_seats)").eq("user_id", userId).maybeSingle(),
    admin.from("videos").select("id,size_bytes,duration_seconds").eq("user_id", userId),
    admin.from("video_events").select("session_id,video_id,watched_seconds").eq("user_id", userId).eq("event_type", "play").gte("created_at", monthStartIso),
    admin.from("video_events").select("video_id,watched_seconds,created_at").eq("user_id", userId).eq("event_type", "play").gte("created_at", ninetyDaysAgo).limit(BANDWIDTH.MAX_EVENTS_FOR_BANDWIDTH),
    admin.from("ai_credit_wallets").select("balance,lifetime_used").eq("user_id", userId).maybeSingle(),
    admin.from("videos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getAccountAccess(userId),
  ]);
  const plan = Array.isArray(subscription.data?.plan) ? subscription.data.plan[0] : subscription.data?.plan;
  const storageBytes = (storage.data ?? []).reduce((total, item) => {
    const bytes = Number(item.size_bytes);
    return total + (Number.isFinite(bytes) && bytes > 0 ? bytes : 0);
  }, 0);
  const videoMeta = new Map<string, { sizeBytes: number; durationSeconds: number }>();
  for (const item of storage.data ?? []) {
    const sizeBytes = Number(item.size_bytes);
    const durationSeconds = Number(item.duration_seconds);
    if (typeof item.id === "string" && item.id && Number.isFinite(sizeBytes) && Number.isFinite(durationSeconds)) {
      videoMeta.set(item.id, { sizeBytes, durationSeconds });
    }
  }
  const uniquePlays = new Set((plays.data ?? []).map((item) => item.session_id)).size;
  const monthEgressBytes = (plays.data ?? []).reduce((total, item) => {
    const meta = typeof item.video_id === "string" ? videoMeta.get(item.video_id) : undefined;
    if (!meta) return total;
    const watchedSeconds = Number(item.watched_seconds);
    if (!Number.isFinite(watchedSeconds)) return total;
    return total + estimateEgressBytes({ plays: 1, sizeBytes: meta.sizeBytes, watchedSeconds, durationSeconds: meta.durationSeconds });
  }, 0);
  const monthCostCents = bandwidthCostCents(monthEgressBytes, BANDWIDTH.EGRESS_CENTS_PER_GB);
  const dailyEvents = (recentPlays.data ?? []).flatMap((item) => {
    const meta = typeof item.video_id === "string" ? videoMeta.get(item.video_id) : undefined;
    if (!meta || typeof item.created_at !== "string") return [];
    const watchedSeconds = Number(item.watched_seconds);
    if (!Number.isFinite(watchedSeconds)) return [];
    const egressBytes = estimateEgressBytes({ plays: 1, sizeBytes: meta.sizeBytes, watchedSeconds, durationSeconds: meta.durationSeconds });
    return egressBytes > 0 ? [{ created_at: item.created_at, egressBytes }] : [];
  });
  const series90 = summarizeBandwidthByDay(dailyEvents);
  const series30 = summarizeBandwidthByDay(dailyEvents.filter((event) => event.created_at >= monthStartIso));
  return NextResponse.json({
    access,
    subscription: subscription.data ? { status: subscription.data.status, currentPeriodEnd: subscription.data.current_period_end, billingMethod: subscription.data.billing_method } : null,
    plan: plan ?? null,
    usage: {
      plays: uniquePlays,
      storageBytes,
      videos: videos.count ?? 0,
      aiCredits: wallet.data?.balance ?? 0,
      aiUsed: wallet.data?.lifetime_used ?? 0,
      bandwidth: {
        monthEgressBytes,
        monthCostCents,
        gb: monthEgressBytes / 1024 ** 3,
        centsPerGb: BANDWIDTH.EGRESS_CENTS_PER_GB,
        series30,
        series90,
        trendPct: trendPercentage(series90),
      },
    },
  });
}
