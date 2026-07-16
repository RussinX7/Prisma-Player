import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Não autenticado." } }, { status: 401 });
  const { data } = await createAdminClient().from("subscriptions").select("id,status,current_period_start,current_period_end,created_at,billing_plans!inner(name,amount_cents,currency)").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return NextResponse.json({ data: null });
  const plan = data.billing_plans as unknown as { name: string; amount_cents: number; currency: string };
  return NextResponse.json({ data: { id: data.id, status: data.status, currentPeriodStart: data.current_period_start, currentPeriodEnd: data.current_period_end, createdAt: data.created_at, plan } });
}
