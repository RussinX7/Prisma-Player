import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Chave publica HMAC publicada na documentacao oficial da AbacatePay.
const DEFAULT_PUBLIC_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSecret(received: string | null) {
  const configured = process.env.ABACATEPAY_WEBHOOK_SECRET;
  return Boolean(received && configured && safeEqual(received, configured));
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const key = process.env.ABACATEPAY_PUBLIC_KEY || DEFAULT_PUBLIC_KEY;
  const expected = createHmac("sha256", key).update(Buffer.from(rawBody, "utf8")).digest("base64");
  return safeEqual(expected, signature);
}
