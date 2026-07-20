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

function clientIp(request: Request): string {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.split(",")[0]?.trim();
    if (value && value !== "unknown" && value !== "::1" && value !== "127.0.0.1") return value;
  }
  return "unknown";
}

export async function rateLimit(
  request: Request,
  scope: string,
  options: { max: number; windowMs: number }
): Promise<NextResponse | null> {
  await cleanupExpired();

  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const expiresAt = new Date(now + options.windowMs).toISOString();

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("rate_limits")
      .select("count, expires_at")
      .eq("key", key)
      .maybeSingle();

    if (!existing || new Date(existing.expires_at).getTime() <= now) {
      await admin
        .from("rate_limits")
        .upsert({ key, count: 1, expires_at: expiresAt }, { onConflict: "key" });
      return null;
    }

    const newCount = existing.count + 1;
    await admin
      .from("rate_limits")
      .update({ count: newCount, expires_at: expiresAt })
      .eq("key", key);

    if (newCount <= options.max) return null;

    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((new Date(existing.expires_at).getTime() - now) / 1000)),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return null;
  }
}
