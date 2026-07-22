import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECURITY } from "@/lib/constants";

let lastCleanup = 0;

async function cleanupExpired(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < SECURITY.RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  try {
    const admin = createAdminClient();
    await admin.rpc("cleanup_rate_limits");
  } catch {
  }
}

/**
 * Only headers the hosting platform itself sets can be trusted here. Anything a
 * client can forge would let an attacker reset its own bucket on every request
 * and walk straight through the login and password limits.
 *
 * Vercel strips inbound `x-vercel-*` headers and rewrites them with the real
 * peer address, so `x-vercel-forwarded-for` is authoritative in production.
 * `cf-connecting-ip` is only meaningful when Cloudflare actually fronts the
 * deployment, so it stays behind an explicit opt-in.
 */
function clientIp(request: Request): string {
  const candidates = [
    process.env.TRUST_CLOUDFLARE_IP_HEADER === "true" ? request.headers.get("cf-connecting-ip") : null,
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-real-ip"),
    // Last resort for self-hosted deployments; never reached on Vercel.
    request.headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.split(",")[0]?.trim();
    if (value && value !== "unknown" && value !== "::1" && value !== "127.0.0.1") return value;
  }
  return "unknown";
}

function limitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfterSeconds)),
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * `failClosed` decides what happens when the counter store is unreachable.
 * Authentication-adjacent endpoints pass `true` so an outage cannot silently
 * disable brute-force protection; telemetry endpoints stay open so a database
 * hiccup does not drop customer analytics.
 */
export async function rateLimit(
  request: Request,
  scope: string,
  options: { max: number; windowMs: number; failClosed?: boolean }
): Promise<NextResponse | null> {
  await cleanupExpired();

  const key = `${scope}:${clientIp(request)}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("consume_rate_limit", { p_key: key, p_window_ms: options.windowMs })
      .maybeSingle<{ hit_count: number; window_expires_at: string }>();

    if (error || !data) throw error ?? new Error("rate_limit_unavailable");
    if (data.hit_count <= options.max) return null;

    const retryAfter = Math.ceil((new Date(data.window_expires_at).getTime() - Date.now()) / 1000);
    return limitedResponse(retryAfter);
  } catch {
    return options.failClosed ? limitedResponse(Math.ceil(options.windowMs / 1000)) : null;
  }
}
