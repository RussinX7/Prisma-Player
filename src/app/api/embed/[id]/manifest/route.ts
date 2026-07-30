import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { domainAllowed, trustedEmbedHostFromHeaders } from "@/lib/security/embed-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { envInt } from "@/lib/config/env";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_MAX = envInt("EMBED_MANIFEST_RATE_LIMIT_MAX", 600);
const RATE_LIMIT_WINDOW_MS = envInt("EMBED_MANIFEST_RATE_LIMIT_WINDOW_MS", 60_000);

/**
 * Allowlist de chaves PUBLICAS do player config que o manifest cachea na borda.
 * Regras de trafego (allowedCountries/allowedDevices/browserLanguage/trafficEnabled)
 * sao intencionalmente OMITIDAS: sao checadas por request no endpoint dinamico
 * /api/embed/:id, evitando evasao por cache da CDN e por fingerprint de pais.
 * Adicionar uma chave aqui so faze-lo apos revisao de seguranca (vazamento potencial).
 */
const MANIFEST_CONFIG_KEYS = [
  "autoplayMessage", "autoplayBackground", "autoplayTextColor", "autoplayRadius",
  "accent", "progressColor", "progressHeight", "smartProgress", "smartAutoplay",
  "smartPause", "muted", "loop", "bigPlay", "playPause", "fullscreenDesktop", "fullscreenMobile",
  "radius", "playbackRate", "thumbnailEnabled", "captionsEnabled",
  "ctaEnabled", "ctaStart", "ctaEnd", "ctaText", "ctaUrl", "ctaNewTab", "ctaBackground",
  "ctaTextColor", "ctaFontSize", "ctaRadius", "ctaPaddingX", "ctaPaddingY", "ctaShadow",
  "ctaPulse", "ctaHoverBackground", "ctaHoverTextColor", "ctaPersist", "ctaAutoScroll",
  "headline", "headlineColor", "headlineBackground", "headlineAlign",
] as const;

function sanitizeConfigForManifest(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of MANIFEST_CONFIG_KEYS) {
    if (key in raw) out[key] = raw[key];
  }
  if (Number(out.radius) === 12) out.radius = 0;
  return out;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const limited = await rateLimit(request, `embed-manifest:${id}`, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (limited) return limited;

  const supabase = createAdminClient();
  const fields = "id,video_id,config,allowed_domains,published";
  const byPlayerId = await supabase.from("player_configs").select(fields).eq("id", id).eq("published", true).maybeSingle();
  if (byPlayerId.error) {
    console.error("embed manifest player lookup failed", { code: byPlayerId.error.code, message: byPlayerId.error.message });
    return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
  }
  let playerConfig = byPlayerId.data;
  if (!playerConfig) {
    const byVideoId = await supabase.from("player_configs").select(fields).eq("video_id", id).eq("published", true).maybeSingle();
    if (byVideoId.error) {
      console.error("embed manifest video lookup failed", { code: byVideoId.error.code, message: byVideoId.error.message });
      return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
    }
    playerConfig = byVideoId.data;
  }
  if (!playerConfig) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const domains = Array.isArray(playerConfig.allowed_domains) ? playerConfig.allowed_domains.map((d) => d.trim()).filter(Boolean) : [];
  const host = trustedEmbedHostFromHeaders(request.headers);
  // Usa a mesma normalização do endpoint dinâmico (www., https://, curinga *.).
  // A comparação exata anterior bloqueava clientes legítimos que cadastraram o
  // domínio em qualquer outro formato.
  if (domains.length > 0 && (!host || !domainAllowed(host, domains))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const config = playerConfig.config && typeof playerConfig.config === "object"
    ? sanitizeConfigForManifest(playerConfig.config as Record<string, unknown>)
    : {};

  return NextResponse.json(
    { id: playerConfig.id, videoId: playerConfig.video_id, config, allowedDomains: domains },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=30, stale-while-revalidate=300",
        "cloudflare-cdn-cache": "public, s-maxage=30, stale-while-revalidate=300",
        "cache-tag": `player:${playerConfig.id}`,
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
