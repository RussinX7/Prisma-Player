import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret, verifyWebhookSignature } from "@/lib/billing/abacatepay/webhook";
import type { AbacateWebhook } from "@/lib/billing/abacatepay/types";
import { activatePaidAiCreditCheckout } from "@/lib/billing/ai-credit-reconcile";
import { cancelPreviousProviderSubscription, nextPeriodEnd } from "@/lib/billing/shared-activation";
import { getPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";

const supportedEvents = new Set([
  "checkout.completed",
  "checkout.refunded",
  "checkout.disputed",
  "checkout.lost",
  "subscription.completed",
  "subscription.renewed",
  "subscription.cancelled",
]);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function firstString(objects: Array<Record<string, unknown> | null>, key: string): string | null {
  for (const object of objects) {
    const value = stringValue(object?.[key]);
    if (value) return value;
  }
  return null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature")
    || request.headers.get("x-abacate-signature")
    || request.headers.get("x-signature");
  const validSecret = verifyWebhookSecret(url.searchParams.get("webhookSecret"));
  const validSignature = verifyWebhookSignature(rawBody, signature);
  // Both mechanisms prove knowledge of the same registered webhook secret, so
  // either one is sufficient. Requiring both would reject every real delivery
  // whenever AbacatePay sends only the URL secret.
  if (!validSecret && !validSignature) {
    console.warn("AbacatePay webhook authentication failed", { validSecret, validSignature, hasSignature: Boolean(signature) });
    return NextResponse.json({ error: "invalid_webhook_signature" }, { status: 401 });
  }

  let event: AbacateWebhook;
  try {
    event = JSON.parse(rawBody) as AbacateWebhook;
  } catch {
    return NextResponse.json({ error: "invalid_webhook_json" }, { status: 400 });
  }
  if (!event?.event || !event.data) return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
  if (!supportedEvents.has(event.event)) return NextResponse.json({ ok: true, ignored: true });
  if (event.devMode) {
    console.warn("AbacatePay webhook received in devMode; ignoring", { event: event.event });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const providerEventId = stringValue(event.id) || createHash("sha256").update(rawBody).digest("hex");
  const dataObject = objectValue(event.data);
  const subscriptionObject = objectValue(dataObject?.subscription);
  const checkoutObject = objectValue(dataObject?.checkout) || objectValue(dataObject?.payment) || subscriptionObject || dataObject;
  const metadataObject = objectValue(checkoutObject?.metadata) || objectValue(dataObject?.metadata);
  const candidates = [checkoutObject, dataObject, subscriptionObject];
  const externalId = firstString(candidates, "externalId") || firstString(candidates, "external_id");
  const providerObjectId = firstString(candidates, "id");
  const creditCheckoutId = firstString([metadataObject], "prismaCreditCheckoutId");
  const admin = createAdminClient();

  const existing = await admin.from("payment_webhook_events").select("status").eq("provider_event_id", providerEventId).maybeSingle();
  if (existing.data?.status === "processed" || existing.data?.status === "ignored") return NextResponse.json({ ok: true, duplicate: true });
  if (!existing.data) {
    const inserted = await admin.from("payment_webhook_events").insert({ provider_event_id: providerEventId, event_name: event.event, provider_object_id: providerObjectId, payload: event });
    if (inserted.error && inserted.error.code !== "23505") return NextResponse.json({ error: "event_store_failed" }, { status: 500 });
  }

  await admin.from("payment_webhook_events").update({ status: "processing", processing_error: null }).eq("provider_event_id", providerEventId);
  try {
    const isCreditCheckout = Boolean(creditCheckoutId || externalId?.startsWith("prisma_ai_"));
    if (isCreditCheckout) {
      let creditQuery = admin.from("ai_credit_checkouts").select("id,user_id,external_id,status");
      creditQuery = creditCheckoutId ? creditQuery.eq("id", creditCheckoutId) : creditQuery.eq("external_id", externalId!);
      const creditResult = await creditQuery.single();
      if (creditResult.error || !creditResult.data) throw new Error("credit_checkout_not_found");
      const now = new Date().toISOString();
      if (event.event === "checkout.completed") {
        await activatePaidAiCreditCheckout(creditResult.data, { id: providerObjectId ?? `webhook:${providerEventId}` });
      } else if (["checkout.refunded", "checkout.disputed", "checkout.lost"].includes(event.event)) {
        await admin.from("ai_credit_checkouts").update({ status: event.event === "checkout.refunded" ? "refunded" : "disputed", updated_at: now }).eq("id", creditResult.data.id);
      } else {
        await admin.from("payment_webhook_events").update({ status: "ignored", processed_at: now }).eq("provider_event_id", providerEventId);
        return NextResponse.json({ ok: true, ignored: true });
      }
      await admin.from("payment_webhook_events").update({ status: "processed", processed_at: now }).eq("provider_event_id", providerEventId);
      return NextResponse.json({ ok: true });
    }
    if (!externalId) throw new Error("missing_external_id");
    const checkoutResult = await admin.from("billing_checkouts").select("id,user_id,plan_id,checkout_type,previous_provider_subscription_id").eq("external_id", externalId).single();
    if (checkoutResult.error || !checkoutResult.data) throw new Error("checkout_not_found");
    const checkout = checkoutResult.data;
    const now = new Date().toISOString();

    if (event.event === "checkout.completed" || event.event === "subscription.completed" || event.event === "subscription.renewed") {
      const newProviderSubscriptionId = checkout.checkout_type === "card_subscription" ? stringValue(subscriptionObject?.id) : null;
      await cancelPreviousProviderSubscription(checkout.previous_provider_subscription_id, newProviderSubscriptionId);
      await admin.from("billing_checkouts").update({ status: "paid", paid_at: now, provider_checkout_id: providerObjectId, receipt_url: stringValue(checkoutObject?.receiptUrl), previous_provider_subscription_id: null, updated_at: now }).eq("id", checkout.id);
      const subscriptionUpdate: Record<string, unknown> = {
        user_id: checkout.user_id,
        plan_id: checkout.plan_id,
        source_checkout_id: checkout.id,
        billing_method: checkout.checkout_type === "pix" ? "pix" : "card",
        status: "active",
        current_period_start: now,
        current_period_end: nextPeriodEnd(),
        cancelled_at: null,
        updated_at: now,
      };
      if (newProviderSubscriptionId) subscriptionUpdate.provider_subscription_id = newProviderSubscriptionId;
      const saved = await admin.from("subscriptions").upsert(subscriptionUpdate, { onConflict: "user_id" });
      if (saved.error) throw new Error("subscription_save_failed");
      const phClient = getPostHogClient();
      const phEventName = event.event === "subscription.renewed" ? "subscription_renewed" : "subscription_activated";
      phClient.capture({
        distinctId: checkout.user_id,
        event: phEventName,
        properties: { plan_id: checkout.plan_id, billing_method: subscriptionUpdate.billing_method, webhook_event: event.event },
      });
      await phClient.flush();
    } else if (["checkout.refunded", "checkout.disputed", "checkout.lost"].includes(event.event)) {
      const status = event.event === "checkout.refunded" ? "refunded" : "disputed";
      await admin.from("billing_checkouts").update({ status, updated_at: now }).eq("id", checkout.id);
      await admin.from("subscriptions").update({ status: "suspended", updated_at: now }).eq("source_checkout_id", checkout.id);
    } else if (event.event === "subscription.cancelled") {
      await admin.from("billing_checkouts").update({ status: "cancelled", updated_at: now }).eq("id", checkout.id);
      const cancelledProviderId = stringValue(subscriptionObject?.id);
      if (cancelledProviderId) await admin.from("subscriptions").update({ status: "cancelled", cancelled_at: now, updated_at: now }).eq("user_id", checkout.user_id).eq("provider_subscription_id", cancelledProviderId);
      const phClient = getPostHogClient();
      phClient.capture({
        distinctId: checkout.user_id,
        event: "subscription_cancelled_server",
        properties: { plan_id: checkout.plan_id, webhook_event: event.event },
      });
      await phClient.flush();
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
