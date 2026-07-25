/// <reference lib="es2022" />
/// <reference types="@cloudflare/workers-types/2023-07-01" />

/**
 * Prisma Player — Edge cache + rate limit + cache-tag purge.
 *
 * Fase 1 do System Design Scale. Roda defronte à Vercel e:
 *   1. cachea `GET /api/embed/:id/manifest` em KV (TTL 30s).
 *   2. aplica rate limit por IP+scope usando contador no KV.
 *   3. expoe `POST /__purge` para invalidar cache por tag quando
 *      um player_config e atualizado (chamado pela Vercel).
 *
 * Documento de referencia: docs/SYSTEM_DESIGN_SCALE.md (Seccao 4.1 e 6).
 */

interface Env {
  PLAYER_CACHE: KVNamespace;
  ORIGIN: string;
  ORIGIN_HOST: string;
  SHARED_PURGE_SECRET: string;
  MANIFEST_PER_MINUTE_PER_IP: string;
  EMBED_CONFIG_PER_MINUTE_PER_IP: string;
}

function cfIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function rateLimitOk(env: Env, request: Request, scope: string, limit: number): Promise<boolean> {
  const ip = cfIp(request);
  const key = `rl:${scope}:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const windowStart = Math.floor(now / windowMs);
  const bucketKey = `${key}:${windowStart}`;
  const current = parseInt((await env.PLAYER_CACHE.get(bucketKey)) || "0", 10);
  if (current >= limit) return false;
  await env.PLAYER_CACHE.put(bucketKey, String(current + 1), { expirationTtl: Math.ceil(windowMs / 1000) + 5 });
  return true;
}

async function handleManifest(env: Env, request: Request, playerId: string): Promise<Response> {
  const limit = parseInt(env.MANIFEST_PER_MINUTE_PER_IP || "600", 10);
  if (!(await rateLimitOk(env, request, "manifest", limit))) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "60", "cache-control": "no-store" },
    });
  }

  const cacheKey = `manifest:${playerId}`;
  const cached = await env.PLAYER_CACHE.getWithMetadata<{ cachedAt: number }>(cacheKey);
  if (cached?.value) {
    return new Response(cached.value, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=30, stale-while-revalidate=300",
        "x-prisma-cache": "HIT",
      },
    });
  }

  const upstream = await fetch(`https://${env.ORIGIN}/api/embed/${playerId}/manifest`, {
    method: "GET",
    headers: { host: env.ORIGIN_HOST, "user-agent": "prisma-embed-cache-worker" },
  });
  if (!upstream.ok) return upstream;

  const body = await upstream.text();
  await env.PLAYER_CACHE.put(cacheKey, body, { expirationTtl: 30, metadata: { cachedAt: Date.now() } as never });
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, s-maxage=30, stale-while-revalidate=300",
      "x-prisma-cache": "MISS",
    },
  });
}

async function handlePurge(env: Env, request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth || auth !== `Bearer ${env.SHARED_PURGE_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const payload = (await request.json()) as { tag?: string; playerIds?: string[] };
  const playerIds = payload.playerIds ?? [];
  if (payload.tag?.startsWith("player:")) playerIds.push(payload.tag.slice("player:".length));

  await Promise.all(
    playerIds.filter(Boolean).map((id) => env.PLAYER_CACHE.delete(`manifest:${id}`)),
  );
  return new Response(JSON.stringify({ purged: playerIds.length }), { headers: { "content-type": "application/json" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__purge" && request.method === "POST") return handlePurge(env, request);

    const match = url.pathname.match(/^\/api\/embed\/([0-9a-f-]{36})\/manifest$/i);
    if (match && request.method === "GET") return handleManifest(env, request, match[1]);

    // Roteia o restante para a origem (Vercel).
    const upstream = new Request(request);
    upstream.headers.set("host", env.ORIGIN_HOST);
    return fetch(`https://${env.ORIGIN}${url.pathname}${url.search}`, upstream);
  },
} satisfies ExportedHandler<Env>;
