import { NextResponse } from "next/server";

const ALLOWED_ORIGINS_CACHE = new Set<string>();

function getAllowedOrigins(): Set<string> {
  if (ALLOWED_ORIGINS_CACHE.size > 0) return ALLOWED_ORIGINS_CACHE;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) {
    try { ALLOWED_ORIGINS_CACHE.add(new URL(siteUrl).origin); } catch {}
  }
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  if (vercelUrl) {
    try { ALLOWED_ORIGINS_CACHE.add(new URL(vercelUrl).origin); } catch {}
  }
  ALLOWED_ORIGINS_CACHE.add("http://localhost:3000");
  return ALLOWED_ORIGINS_CACHE;
}

function requestOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = getAllowedOrigins();
  const currentOrigin = requestOrigin(request);
  if (currentOrigin) allowed.add(currentOrigin);

  if (!origin && !referer) return false;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (allowed.has(originUrl.origin)) return true;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowed.has(refererUrl.origin)) return true;
    } catch {
      return false;
    }
  }

  return false;
}

export function csrfGuard(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return null;
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "csrf_validation_failed" }, { status: 403 });
  }
  return null;
}
