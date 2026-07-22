import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BILLING } from "@/lib/constants";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function webhookSecret(): string | null {
  return process.env.ABACATEPAY_WEBHOOK_SECRET?.trim() || null;
}

/**
 * The secret AbacatePay appends to the webhook URL (`?webhookSecret=`).
 */
export function verifyWebhookSecret(received: string | null): boolean {
  const configured = webhookSecret();
  if (!configured) return false;
  return Boolean(received && safeEqual(received, configured));
}

/**
 * AbacatePay signs the raw payload with HMAC-SHA256 using the same `secret`
 * registered on the webhook (POST /webhooks/create), not an asymmetric key.
 *
 * The digest encoding is not pinned by the provider docs, so hex and base64 are
 * both accepted, along with the common `sha256=` prefix. Returns false when no
 * signature is present so the caller can fall back to the URL secret.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = webhookSecret();
  if (!signature || !secret) return false;

  const received = signature.trim().replace(/^sha256=/i, "");
  if (!received || received.length > BILLING.WEBHOOK_SIGNATURE_MAX_LENGTH) return false;

  const digest = createHmac("sha256", secret).update(Buffer.from(rawBody, "utf8")).digest();

  return safeEqual(digest.toString("hex"), received.toLowerCase())
    || safeEqual(digest.toString("base64"), received);
}
