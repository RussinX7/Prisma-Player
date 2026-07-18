import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSecret(received: string | null): boolean {
  const configured = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim();
  if (!configured) return false;
  return Boolean(received && safeEqual(received, configured));
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const key = process.env.ABACATEPAY_PUBLIC_KEY;
  if (!key) {
    console.warn("ABACATEPAY_PUBLIC_KEY is not configured; webhook signature verification disabled");
    return false;
  }
  const expected = createHmac("sha256", key).update(Buffer.from(rawBody, "utf8")).digest("base64");
  return safeEqual(expected, signature);
}
