import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const DEFAULT_MAX_AGE_SECONDS = 10 * 60;

export function normalizeHost(value: string | null | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

export function trustedEmbedHostFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeHost(headers.get("referer") || headers.get("origin") || "");
}

export function domainAllowed(host: string, domains: string[]) {
  if (domains.length === 0) return true;
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return false;

  return domains.some((domain) => {
    const normalizedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
    const clean = normalizedDomain.replace(/^\*\./, "");
    return normalizedHost === clean || (normalizedDomain.startsWith("*.") && normalizedHost.endsWith(`.${clean}`));
  });
}

function secret() {
  return process.env.EMBED_ORIGIN_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function base64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  const key = secret();
  if (!key) return "";
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function createEmbedOriginToken(input: { playerId: string; host: string; maxAgeSeconds?: number }) {
  const host = normalizeHost(input.host);
  const key = secret();
  if (!key || !host) return "";

  const payload = base64url(JSON.stringify({
    v: TOKEN_VERSION,
    playerId: input.playerId,
    host,
    exp: Math.floor(Date.now() / 1000) + (input.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS),
  }));
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : "";
}

export function verifyEmbedOriginToken(token: string | null | undefined, playerId: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
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
