import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureBearerMatches } from "@/billing/validation";

export const runtime = "nodejs";
export const maxDuration = 5;

type Payload = { data?: Record<string, unknown>; event?: string; type?: string; subscription_token?: string; status?: string };
const subscriptionStatus: Record<string, string> = {
  assinatura_ativada: "active", assinatura_em_atraso: "past_due", assinatura_suspensa: "suspended",
  assinatura_cancelada: "cancelled", assinatura_reativada: "active",
};

export async function POST(request: NextRequest) {
  if (!secureBearerMatches(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (!raw || raw.length > 512_000) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  let payload: Payload;
  try { payload = JSON.parse(raw) as Payload; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const eventName = request.headers.get("event")?.trim() || payload.event || payload.type;
  const data = payload.data && typeof payload.data === "object" ? payload.data : payload as Record<string, unknown>;
  if (!eventName || eventName.length > 100) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const objectId = String(data.id ?? data.identifier ?? data.subscription_token ?? payload.subscription_token ?? "unknown");
  const objectStatus = String(data.status ?? payload.status ?? "unknown");
  const updatedAt = String(data.updated_at ?? data.updatedAt ?? data.created_at ?? "none");
  const eventKey = `${eventName}:${objectId}:${objectStatus}:${updatedAt}`.slice(0, 500);
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const admin = createAdminClient();
  const { data: stored, error: insertError } = await admin.from("payment_events").insert({ event_name: eventName, event_key: eventKey, provider_object_id: objectId === "unknown" ? null : objectId, payload_hash: payloadHash, payload }).select("id").single();
  if (insertError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (insertError || !stored) {
    console.error("syncpay webhook persistence failed", { code: insertError?.code, eventName });
    return NextResponse.json({ error: "persistence_failed" }, { status: 503 });
  }

  try {
    await admin.from("payment_events").update({ status: "processing", attempts: 1 }).eq("id", stored.id);
    if (eventName === "cashin.create" || eventName === "cashin.update") await processCashIn(admin, eventName, data);
    else if (subscriptionStatus[eventName]) await processSubscription(admin, eventName, data, payload);
    else {
      await admin.from("payment_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", stored.id);
      return NextResponse.json({ received: true, ignored: true });
    }
    await admin.from("payment_events").update({ status: "processed", processed_at: new Date().toISOString(), processing_error: null }).eq("id", stored.id);
    return NextResponse.json({ received: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 500) : "unknown";
    console.error("syncpay webhook processing failed", { eventName, eventId: stored.id, message });
    await admin.from("payment_events").update({ status: "failed", processing_error: message }).eq("id", stored.id);
    return NextResponse.json({ error: "processing_failed" }, { status: 503 });
  }
}

async function processCashIn(admin: ReturnType<typeof createAdminClient>, eventName: string, data: Record<string, unknown>) {
  const identifier = String(data.id ?? data.identifier ?? "");
  if (!identifier) throw new Error("CashIn without identifier");
  const { data: charge } = await admin.from("subscription_charges").select("id,subscription_id,user_id,amount_cents,status").eq("provider_identifier", identifier).maybeSingle();
  if (!charge) return;
  const amountCents = Math.round(Number(data.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents !== charge.amount_cents || data.currency !== "BRL" || String(data.payment_method).toUpperCase() !== "PIX") throw new Error("CashIn integrity validation failed");
  const completed = String(data.status).toLowerCase() === "completed";
  const now = new Date().toISOString();
  await admin.from("subscription_charges").update({ status: completed ? "paid" : "pending", paid_at: completed ? now : null, pix_code: typeof data.pix_code === "string" ? data.pix_code : undefined, provider_updated_at: now, updated_at: now }).eq("id", charge.id);
  await admin.from("subscription_audit_logs").insert({ subscription_id: charge.subscription_id, user_id: charge.user_id, actor_type: "syncpay", action: completed ? "first_payment_completed" : eventName, metadata: { providerIdentifier: identifier } });
  if (completed) {
    const { data: activation } = await admin.from("subscription_audit_logs").select("id").eq("subscription_id", charge.subscription_id).eq("action", "assinatura_ativada").limit(1).maybeSingle();
    if (activation) {
      await admin.from("subscriptions").update({ status: "active", provider_updated_at: now, updated_at: now }).eq("id", charge.subscription_id);
      await admin.from("subscription_audit_logs").insert({ subscription_id: charge.subscription_id, user_id: charge.user_id, actor_type: "system", action: "subscription_activated", new_status: "active" });
    }
  }
}

async function processSubscription(admin: ReturnType<typeof createAdminClient>, eventName: string, data: Record<string, unknown>, payload: Payload) {
  const token = String(data.subscription_token ?? data.token ?? payload.subscription_token ?? "");
  if (!token) throw new Error("Subscription webhook without token");
  const { data: subscription } = await admin.from("subscriptions").select("id,user_id,status").eq("provider_subscription_token", token).maybeSingle();
  if (!subscription) return;
  const next = subscriptionStatus[eventName];
  if (next === "active") {
    const { data: paidCharge } = await admin.from("subscription_charges").select("id").eq("subscription_id", subscription.id).eq("status", "paid").limit(1).maybeSingle();
    if (!paidCharge) {
      await admin.from("subscription_audit_logs").insert({ subscription_id: subscription.id, user_id: subscription.user_id, actor_type: "syncpay", action: eventName, old_status: subscription.status, new_status: subscription.status, metadata: { waitingForValidatedCharge: true } });
      return;
    }
  }
  const now = new Date().toISOString();
  await admin.from("subscriptions").update({ status: next, provider_updated_at: now, current_period_start: data.current_period_start ?? undefined, current_period_end: data.current_period_end ?? undefined, updated_at: now }).eq("id", subscription.id);
  await admin.from("subscription_audit_logs").insert({ subscription_id: subscription.id, user_id: subscription.user_id, actor_type: "syncpay", action: eventName, old_status: subscription.status, new_status: next });
}
