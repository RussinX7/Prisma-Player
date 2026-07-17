import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { abacateRequest } from "./abacatepay/client";
import type { AbacateCheckout } from "./abacatepay/types";

type StoredCheckout = {
  id: string;
  user_id: string;
  plan_id: string;
  checkout_type: "pix" | "card_subscription";
  external_id: string;
  status: string;
};

function nextPeriodEnd() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

export async function activatePaidCheckout(checkout: StoredCheckout, provider: AbacateCheckout) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const method = checkout.checkout_type === "pix" ? "pix" : "card";
  const checkoutUpdate = await admin.from("billing_checkouts").update({
    status: "paid",
    paid_at: now,
    provider_checkout_id: provider.id,
    receipt_url: provider.receiptUrl ?? null,
    updated_at: now,
  }).eq("id", checkout.id).eq("user_id", checkout.user_id);
  if (checkoutUpdate.error) throw new Error("billing_checkout_payment_save_failed");

  const subscriptionUpdate = await admin.from("subscriptions").upsert({
    user_id: checkout.user_id,
    plan_id: checkout.plan_id,
    source_checkout_id: checkout.id,
    billing_method: method,
    status: "active",
    current_period_start: now,
    current_period_end: nextPeriodEnd(),
    cancelled_at: null,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (subscriptionUpdate.error) throw new Error("subscription_save_failed");
}

export async function reconcileBillingCheckout(checkout: StoredCheckout) {
  if (checkout.status !== "pending" && checkout.status !== "creating") return false;
  const path = checkout.checkout_type === "pix" ? "/checkouts/list" : "/subscriptions/list";
  const params = new URLSearchParams({ externalId: checkout.external_id, limit: "1" });
  const matches = await abacateRequest<AbacateCheckout[]>(`${path}?${params.toString()}`);
  const provider = matches.find((item) => item.externalId === checkout.external_id);
  if (!provider) return false;

  const status = provider.status.toUpperCase();
  if (status === "PAID") {
    await activatePaidCheckout(checkout, provider);
    return true;
  }
  if (["EXPIRED", "CANCELLED", "REFUNDED"].includes(status)) {
    const localStatus = status === "REFUNDED" ? "refunded" : status.toLowerCase();
    const admin = createAdminClient();
    await admin.from("billing_checkouts").update({ status: localStatus, updated_at: new Date().toISOString() }).eq("id", checkout.id).eq("user_id", checkout.user_id);
  }
  return false;
}
