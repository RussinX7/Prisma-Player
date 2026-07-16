import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: { code: "unauthorized", message: "Não autenticado." } }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: { code: "not_found", message: "Cobrança não encontrada." } }, { status: 404 });
  const admin = createAdminClient();
  const { data } = await admin.from("subscription_charges").select("id,status,amount_cents,pix_code,qr_code,expires_at,subscription_id,subscriptions!inner(status)").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return NextResponse.json({ error: { code: "not_found", message: "Cobrança não encontrada." } }, { status: 404 });
  const linked = data.subscriptions as unknown as { status: string };
  return NextResponse.json({ data: { chargeId: data.id, chargeStatus: data.status, subscriptionStatus: linked.status, amountCents: data.amount_cents, payment: { pixCode: data.pix_code, qrCode: data.qr_code, expiresAt: data.expires_at } } });
}
