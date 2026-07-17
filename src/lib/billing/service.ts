import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { abacateRequest } from "./abacatepay/client";
import type { AbacateCheckout, AbacateCustomer, AbacateProduct } from "./abacatepay/types";
import type { BillingPlan } from "./catalog";

type CheckoutType = "pix" | "card_subscription";
type Profile = { email: string; full_name: string | null; phone: string | null };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function ensureCustomer(userId: string, profile: Profile) {
  const admin = createAdminClient();
  const existing = await admin.from("billing_customers").select("provider_customer_id").eq("user_id", userId).maybeSingle();
  if (existing.data?.provider_customer_id) return existing.data.provider_customer_id;

  const customer = await abacateRequest<AbacateCustomer>("/customers/create", {
    method: "POST",
    body: JSON.stringify({
      data: { email: profile.email, name: profile.full_name || undefined, cellphone: profile.phone || undefined },
      metadata: { prismaUserId: userId },
    }),
  });
  const saved = await admin.from("billing_customers").upsert({ user_id: userId, provider_customer_id: customer.id, updated_at: new Date().toISOString() });
  if (saved.error) throw new Error("billing_customer_save_failed");
  return customer.id;
}

async function listProducts() {
  const result = await abacateRequest<AbacateProduct[] | { data?: AbacateProduct[] }>("/products/list?limit=100");
  return Array.isArray(result) ? result : result.data ?? [];
}

async function ensureProduct(plan: BillingPlan, type: CheckoutType) {
  const admin = createAdminClient();
  const column = type === "pix" ? "provider_pix_product_id" : "provider_card_product_id";
  if (plan[column]) return plan[column] as string;

  const externalId = `${plan.slug}-${type === "pix" ? "pix-month" : "card-monthly"}`;
  const products = await listProducts();
  let product = products.find((item) => item.externalId === externalId);
  if (!product) {
    product = await abacateRequest<AbacateProduct>("/products/create", {
      method: "POST",
      body: JSON.stringify({
        externalId,
        name: `${plan.name} - ${type === "pix" ? "30 dias via PIX" : "Cartao mensal"}`,
        description: plan.description,
        price: plan.amount_cents,
        currency: "BRL",
        ...(type === "card_subscription" ? { cycle: "MONTHLY" } : {}),
      }),
    });
  }
  const saved = await admin.from("billing_plans").update({ [column]: product.id, updated_at: new Date().toISOString() }).eq("id", plan.id);
  if (saved.error) throw new Error("billing_product_save_failed");
  return product.id;
}

export async function createBillingCheckout(userId: string, plan: BillingPlan, type: CheckoutType) {
  const admin = createAdminClient();
  const profileResult = await admin.from("profiles").select("email,full_name,phone").eq("id", userId).single();
  if (profileResult.error || !profileResult.data?.email) throw new Error("billing_profile_missing");

  const customerId = await ensureCustomer(userId, profileResult.data);
  const productId = await ensureProduct(plan, type);
  const checkoutId = crypto.randomUUID();
  const externalId = `prisma_${checkoutId}`;
  const inserted = await admin.from("billing_checkouts").insert({
    id: checkoutId,
    user_id: userId,
    plan_id: plan.id,
    checkout_type: type,
    external_id: externalId,
    amount_cents: plan.amount_cents,
  });
  if (inserted.error) throw new Error("billing_checkout_create_failed");

  const path = type === "pix" ? "/checkouts/create" : "/subscriptions/create";
  try {
    const checkout = await abacateRequest<AbacateCheckout>(path, {
      method: "POST",
      body: JSON.stringify({
        items: [{ id: productId, quantity: 1 }],
        customerId,
        externalId,
        methods: [type === "pix" ? "PIX" : "CARD"],
        returnUrl: `${siteUrl()}/pricing`,
        completionUrl: `${siteUrl()}/checkout/result?checkout=${checkoutId}`,
        metadata: { prismaUserId: userId, prismaPlan: plan.slug, prismaCheckoutId: checkoutId },
        ...(type === "card_subscription" ? { retryPolicy: { maxRetry: 3, retryEvery: 2 } } : {}),
      }),
    });
    const updated = await admin.from("billing_checkouts").update({ provider_checkout_id: checkout.id, checkout_url: checkout.url, status: "pending", updated_at: new Date().toISOString() }).eq("id", checkoutId);
    if (updated.error) throw new Error("billing_checkout_update_failed");
    return { id: checkoutId, url: checkout.url };
  } catch (error) {
    await admin.from("billing_checkouts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", checkoutId);
    throw error;
  }
}
