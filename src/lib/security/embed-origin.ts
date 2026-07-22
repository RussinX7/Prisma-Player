import { createHmac, timingSafeEqual } from "node:crypto";
import { safeLog } from "@/lib/utils/log";

const TOKEN_VERSION = "v1";
const DEFAULT_MAX_AGE_SECONDS = 10 * 60;

export function normalizeHost(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

export function trustedEmbedHostFromHeaders(headers: Pick<Headers, "get">): string {
  return normalizeHost(headers.get("referer") || headers.get("origin") || "");
}

export function domainAllowed(host: string, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return false;

  return domains.some((domain) => {
    const normalizedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    const clean = normalizedDomain.replace(/^\*\./, "");
    return normalizedHost === clean || (normalizedDomain.startsWith("*.") && normalizedHost.endsWith(`.${clean}`));
  });
}

function embedSecret(): string {
  const value = process.env.EMBED_ORIGIN_SECRET?.trim();
  if (!value) {
    throw new Error("EMBED_ORIGIN_SECRET is not configured. Set this environment variable to a random secret string, independent of SUPABASE keys.");
  }
  return value;
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  const key = embedSecret();
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function createEmbedOriginToken(input: { playerId: string; host: string; maxAgeSeconds?: number }): string {
  const host = normalizeHost(input.host);
  if (!host) return "";

  const payload = base64url(JSON.stringify({
    v: TOKEN_VERSION,
    playerId: input.playerId,
    host,
    exp: Math.floor(Date.now() / 1000) + (input.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS),
  }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

/**
 * Creates the short-lived origin token used by the embed without allowing a
 * missing production secret to crash the whole iframe during server render.
 *
 * Returning an empty token does not bypass domain protection: the embed API
 * rejects protected players when the token cannot be verified.
 */
export function createEmbedOriginTokenSafely(input: { playerId: string; host: string; maxAgeSeconds?: number }): string {
  try {
    return createEmbedOriginToken(input);
  } catch (error) {
    safeLog("embed_origin_token_unavailable", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return "";
  }
}

const EVENT_TOKEN_KIND = "evt";
const EVENT_TOKEN_MAX_AGE_SECONDS = 6 * 60 * 60;

/**
 * Binds telemetry to a real embed load. Without it, anyone who knows the public
 * video UUID can forge plays and conversions — including for players whose
 * allowed_domains they were never able to satisfy.
 *
 * The TTL covers a long VSL session; the token carries no secret of its own and
 * is scoped to a single video.
 */
export function createEmbedEventToken(videoId: string, maxAgeSeconds = EVENT_TOKEN_MAX_AGE_SECONDS): string {
  const payload = base64url(JSON.stringify({
    v: TOKEN_VERSION,
    k: EVENT_TOKEN_KIND,
    videoId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }));
  return `${payload}.${sign(payload)}`;
}

export function createEmbedEventTokenSafely(videoId: string): string {
  try {
    return createEmbedEventToken(videoId);
  } catch (error) {
    safeLog("embed_event_token_unavailable", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return "";
  }
}

export function verifyEmbedEventToken(token: string | null | undefined, videoId: string): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "base64url");
  const actualBuffer = Buffer.from(signature, "base64url");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return false;

  try {
    const parsed = JSON.parse(fromBase64url(payload)) as { v?: string; k?: string; videoId?: string; exp?: number };
    if (parsed.v !== TOKEN_VERSION || parsed.k !== EVENT_TOKEN_KIND || parsed.videoId !== videoId) return false;
    return Boolean(parsed.exp && parsed.exp >= Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

export function verifyEmbedOriginToken(token: string | null | undefined, playerId: string): { host: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  if (!expected) return null;

  const expectedBuffer = Buffer.from(expected, "base64url");
  const actualBuffer = Buffer.from(signature, "base64url");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  try {
    const parsed = JSON.parse(fromBase64url(payload)) as { v?: string; playerId?: string; host?: string; exp?: number };
    if (parsed.v !== TOKEN_VERSION || (parsed.playerId !== playerId && parsed.playerId !== "*") || !parsed.host) return null;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { host: normalizeHost(parsed.host) };
  } catch {
    return null;
  }
}
