import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountAccess } from "@/lib/access/service";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [subscription, storage, plays, wallet, videos, access] = await Promise.all([
    admin.from("subscriptions").select("status,current_period_end,billing_method,plan:billing_plans(name,included_plays,storage_gb,prisma_ai_analyses,team_seats)").eq("user_id", userId).maybeSingle(),
    admin.from("videos").select("size_bytes").eq("user_id", userId),
    admin.from("video_events").select("session_id").eq("user_id", userId).eq("event_type", "play").gte("created_at", monthStart.toISOString()),
    admin.from("ai_credit_wallets").select("balance,lifetime_used").eq("user_id", userId).maybeSingle(),
    admin.from("videos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getAccountAccess(userId),
  ]);
  const plan = Array.isArray(subscription.data?.plan) ? subscription.data.plan[0] : subscription.data?.plan;
  const storageBytes = (storage.data ?? []).reduce((total, item) => total + Number(item.size_bytes ?? 0), 0);
  const uniquePlays = new Set((plays.data ?? []).map((item) => item.session_id)).size;
  return NextResponse.json({
    access,
    subscription: subscription.data ? { status: subscription.data.status, currentPeriodEnd: subscription.data.current_period_end, billingMethod: subscription.data.billing_method } : null,
    plan: plan ?? null,
    usage: { plays: uniquePlays, storageBytes, videos: videos.count ?? 0, aiCredits: wallet.data?.balance ?? 0, aiUsed: wallet.data?.lifetime_used ?? 0 },
  });
}
