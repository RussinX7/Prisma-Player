import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret, verifyWebhookSignature } from "@/lib/billing/abacatepay/webhook";
import type { AbacateWebhook } from "@/lib/billing/abacatepay/types";

export const runtime = "nodejs";

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function nextPeriodEnd() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") || request.headers.get("x-abacate-signature");
  if (!verifyWebhookSecret(url.searchParams.get("webhookSecret")) || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_webhook_signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as AbacateWebhook;
  if (!event?.event || !event.data) return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });

  const providerEventId = stringValue(event.id) || createHash("sha256").update(rawBody).digest("hex");
  const subscriptionObject = objectValue(event.data.subscription);
  const checkoutObject = objectValue(event.data.checkout) || subscriptionObject;
  const externalId = stringValue(checkoutObject?.externalId);
  const providerObjectId = stringValue(checkoutObject?.id);
  const admin = createAdminClient();

  const existing = await admin.from("payment_webhook_events").select("status").eq("provider_event_id", providerEventId).maybeSingle();
  if (existing.data?.status === "processed" || existing.data?.status === "ignored") return NextResponse.json({ ok: true, duplicate: true });
  if (!existing.data) {
    const inserted = await admin.from("payment_webhook_events").insert({ provider_event_id: providerEventId, event_name: event.event, provider_object_id: providerObjectId, payload: event });
    if (inserted.error && inserted.error.code !== "23505") return NextResponse.json({ error: "event_store_failed" }, { status: 500 });
  }

  await admin.from("payment_webhook_events").update({ status: "processing", processing_error: null }).eq("provider_event_id", providerEventId);
  try {
    if (!externalId) throw new Error("missing_external_id");
    if (externalId.startsWith("prisma_ai_")) {
      const creditResult = await admin.from("ai_credit_checkouts").select("id,user_id").eq("external_id", externalId).single();
      if (creditResult.error || !creditResult.data) throw new Error("credit_checkout_not_found");
      const now = new Date().toISOString();
      if (event.event === "checkout.completed") {
        await admin.from("ai_credit_checkouts").update({ status: "paid", paid_at: now, provider_checkout_id: providerObjectId, updated_at: now }).eq("id", creditResult.data.id);
        const applied = await admin.rpc("apply_ai_credit_purchase", { p_checkout_id: creditResult.data.id, p_provider_event_id: providerEventId });
        if (applied.error) throw new Error("credit_wallet_update_failed");
        await admin.from("user_inbox").insert({ user_id: creditResult.data.user_id, kind: "billing", title: "Creditos Prisma IA adicionados", message: "Seu pagamento foi confirmado e os novos creditos ja estao disponiveis." });
      } else if (["checkout.refunded", "checkout.disputed", "checkout.lost"].includes(event.event)) {
        await admin.from("ai_credit_checkouts").update({ status: event.event === "checkout.refunded" ? "refunded" : "disputed", updated_at: now }).eq("id", creditResult.data.id);
      } else {
        await admin.from("payment_webhook_events").update({ status: "ignored", processed_at: now }).eq("provider_event_id", providerEventId);
        return NextResponse.json({ ok: true, ignored: true });
      }
      await admin.from("payment_webhook_events").update({ status: "processed", processed_at: now }).eq("provider_event_id", providerEventId);
      return NextResponse.json({ ok: true });
    }
    const checkoutResult = await admin.from("billing_checkouts").select("id,user_id,plan_id,checkout_type").eq("external_id", externalId).single();
    if (checkoutResult.error || !checkoutResult.data) throw new Error("checkout_not_found");
    const checkout = checkoutResult.data;
    const now = new Date().toISOString();

    if (event.event === "checkout.completed" || event.event === "subscription.completed" || event.event === "subscription.renewed") {
      const method = checkout.checkout_type === "pix" ? "pix" : "card";
      await admin.from("billing_checkouts").update({ status: "paid", paid_at: now, provider_checkout_id: providerObjectId, receipt_url: stringValue(checkoutObject?.receiptUrl), updated_at: now }).eq("id", checkout.id);
      const subscriptionUpdate = {
        user_id: checkout.user_id,
        plan_id: checkout.plan_id,
        source_checkout_id: checkout.id,
        billing_method: method,
        provider_subscription_id: method === "card" ? stringValue(subscriptionObject?.id) : null,
        status: "active",
        current_period_start: now,
        current_period_end: nextPeriodEnd(),
        cancelled_at: null,
        updated_at: now,
      };
      const saved = await admin.from("subscriptions").upsert(subscriptionUpdate, { onConflict: "user_id" });
      if (saved.error) throw new Error("subscription_save_failed");
    } else if (["checkout.refunded", "checkout.disputed", "checkout.lost"].includes(event.event)) {
      const status = event.event === "checkout.refunded" ? "refunded" : "disputed";
      await admin.from("billing_checkouts").update({ status, updated_at: now }).eq("id", checkout.id);
      await admin.from("subscriptions").update({ status: "suspended", updated_at: now }).eq("source_checkout_id", checkout.id);
    } else if (event.event === "subscription.cancelled") {
      await admin.from("billing_checkouts").update({ status: "cancelled", updated_at: now }).eq("id", checkout.id);
      await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: now, updated_at: now }).eq("user_id", checkout.user_id);
    } else {
      await admin.from("payment_webhook_events").update({ status: "ignored", processed_at: now }).eq("provider_event_id", providerEventId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    await admin.from("payment_webhook_events").update({ status: "processed", processed_at: now }).eq("provider_event_id", providerEventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    await admin.from("payment_webhook_events").update({ status: "failed", processing_error: message.slice(0, 500) }).eq("provider_event_id", providerEventId);
    console.error("AbacatePay webhook failed", message);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
