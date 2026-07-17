import "server-only";
import type { AbacateEnvelope } from "./types";

const API_URL = "https://api.abacatepay.com/v2";

function apiKey() {
  const value = process.env.ABACATEPAY_API_KEY?.replace(/\s+/g, "");
  if (!value) throw new Error("ABACATEPAY_API_KEY is not configured");
  return value;
}

export async function abacateRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as AbacateEnvelope<T> | null;
  if (!response.ok || !payload?.success || !payload.data) {
    const message = payload?.error || `AbacatePay request failed (${response.status})`;
    throw new Error(message);
  }
  return payload.data;
}
