import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollSubscriber } from "@/billing/providers/syncpay/client";
import { hashDocument, TERMS_VERSION, validateCheckout } from "@/billing/validation";

export const runtime = "nodejs";

function error(message: string, status: number, code: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return error("Faça login para assinar.", 401, "unauthorized");
  const key = request.headers.get("idempotency-key");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) return error("Tentativa de checkout inválida.", 400, "invalid_idempotency_key");

  let body: unknown;
  try { body = await request.json(); } catch { return error("JSON inválido.", 400, "invalid_json"); }
  const parsed = validateCheckout(body);
  if ("error" in parsed && parsed.error) return error(parsed.error, 422, "validation_error");

  const admin = createAdminClient();
  const { data: plan, error: planError } = await admin.from("billing_plans").select("id,slug,name,amount_cents,currency").eq("slug", parsed.data.planSlug).eq("is_active", true).single();
  if (planError || !plan || plan.amount_cents !== 9700 || plan.currency !== "BRL") return error("Plano indisponível.", 409, "plan_unavailable");

  const { data: previous } = await admin.from("subscriptions").select("id,status").eq("checkout_request_id", key).eq("user_id", userId).maybeSingle();
  if (previous) {
    const { data: charge } = await admin.from("subscription_charges").select("id,status,pix_code,qr_code,expires_at").eq("subscription_id", previous.id).maybeSingle();
    return NextResponse.json({ data: { subscriptionId: previous.id, chargeId: charge?.id, status: previous.status, payment: charge ? { pixCode: charge.pix_code, qrCode: charge.qr_code, expiresAt: charge.expires_at } : null } });
  }

  const termsIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const { data: subscription, error: subscriptionError } = await admin.from("subscriptions").insert({
    user_id: userId, plan_id: plan.id, checkout_request_id: key, document_hash: hashDocument(parsed.data.customer.document),
    terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString(), terms_ip: termsIp, terms_user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
  }).select("id,status").single();
  if (subscriptionError || !subscription) {
    if (subscriptionError?.code === "23505") return error("Você já possui uma assinatura ou checkout em andamento.", 409, "subscription_exists");
    console.error("billing subscription insert failed", { code: subscriptionError?.code });
    return error("Não foi possível iniciar o checkout.", 503, "checkout_unavailable");
  }

  const { data: charge, error: chargeError } = await admin.from("subscription_charges").insert({ subscription_id: subscription.id, user_id: userId, plan_id: plan.id, amount_cents: plan.amount_cents }).select("id").single();
  if (chargeError || !charge) {
    await admin.from("subscriptions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", subscription.id);
    return error("Não foi possível criar a cobrança.", 503, "charge_unavailable");
  }

  try {
    const remote = await enrollSubscriber(parsed.data.customer);
    const now = new Date().toISOString();
    const [{ error: subUpdateError }, { error: chargeUpdateError }] = await Promise.all([
      admin.from("subscriptions").update({ provider_subscription_token: remote.subscription_token, status: "pending_first_payment", billing_method: "qr_code", provider_created_at: now, updated_at: now }).eq("id", subscription.id),
      admin.from("subscription_charges").update({ provider_identifier: remote.payment.identifier, status: "pending", pix_code: remote.payment.pix_code, qr_code: remote.payment.qr_code ?? null, expires_at: remote.payment.expires_at, provider_created_at: now, updated_at: now }).eq("id", charge.id),
      admin.from("subscription_audit_logs").insert({ subscription_id: subscription.id, user_id: userId, actor_type: "user", action: "syncpay_enroll_succeeded", old_status: "creating", new_status: "pending_first_payment" }),
    ]);
    if (subUpdateError || chargeUpdateError) throw new Error("Local billing persistence failed");
    return NextResponse.json({ data: { subscriptionId: subscription.id, chargeId: charge.id, status: "pending_first_payment", amountCents: plan.amount_cents, payment: { pixCode: remote.payment.pix_code, qrCode: remote.payment.qr_code ?? null, expiresAt: remote.payment.expires_at } } }, { status: 201 });
  } catch (cause) {
    console.error("syncpay checkout failed", { subscriptionId: subscription.id, message: cause instanceof Error ? cause.message : "unknown" });
    const now = new Date().toISOString();
    await Promise.all([
      admin.from("subscriptions").update({ status: "failed", updated_at: now }).eq("id", subscription.id),
      admin.from("subscription_charges").update({ status: "failed", failed_at: now, updated_at: now }).eq("id", charge.id),
      admin.from("subscription_audit_logs").insert({ subscription_id: subscription.id, user_id: userId, actor_type: "system", action: "syncpay_enroll_failed", old_status: "creating", new_status: "failed" }),
    ]);
    return error("A SyncPay não conseguiu gerar o PIX. Tente novamente em instantes.", 502, "provider_unavailable");
  }
}
