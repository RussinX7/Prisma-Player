import "server-only";

type TokenResponse = { access_token: string; expires_in?: number; expires_at?: string };
export type EnrollResponse = {
  subscription_token: string;
  status: string;
  billing_method: string;
  payment: { pix_code: string; qr_code?: string | null; identifier: string; expires_at: string };
};

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

function config() {
  const baseUrl = process.env.SYNCPAY_BASE_URL?.trim().replace(/\/$/, "");
  const clientId = process.env.SYNCPAY_CLIENT_ID?.trim();
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET?.replace(/\s+/g, "");
  if (!baseUrl || !clientId || !clientSecret) throw new Error("SyncPay server configuration is incomplete");
  return { baseUrl, clientId, clientSecret };
}

async function requestToken() {
  const { baseUrl, clientId, clientSecret } = config();
  const response = await fetch(`${baseUrl}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`SyncPay authentication failed (${response.status})`);
  const data = (await response.json()) as TokenResponse;
  if (!data.access_token) throw new Error("SyncPay authentication returned no token");
  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : Date.now() + (data.expires_in ?? 3600) * 1000;
  cachedToken = { value: data.access_token, expiresAt: expiresAt - 120_000 };
  return data.access_token;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  tokenRequest ??= requestToken().finally(() => { tokenRequest = null; });
  return tokenRequest;
}

export async function enrollSubscriber(customer: { name: string; email: string; document: string; phone: string }) {
  const { baseUrl } = config();
  const planToken = process.env.SYNCPAY_PLAN_TOKEN?.replace(/\s+/g, "");
  if (!planToken) throw new Error("SYNCPAY_PLAN_TOKEN is not configured");
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl}/api/partner/v1/subscription-plans/${encodeURIComponent(planToken)}/enroll`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(customer),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`SyncPay enrollment failed (${response.status}${requestId ? `, ${requestId}` : ""})`);
  }
  const data = (await response.json()) as EnrollResponse;
  if (!data.subscription_token || !data.payment?.identifier || !data.payment?.pix_code) throw new Error("SyncPay returned an incomplete enrollment");
  return data;
}
