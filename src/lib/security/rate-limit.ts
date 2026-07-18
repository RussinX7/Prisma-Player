import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
}

export function rateLimit(request: Request, scope: string, options: { max: number; windowMs: number }) {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= options.max) return null;

  return NextResponse.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "retry-after": String(Math.ceil((current.resetAt - now) / 1000)),
        "cache-control": "no-store",
      },
    },
  );
}
