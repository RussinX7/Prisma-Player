import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trustedEmbedHostFromHeaders } from "@/lib/security/embed-origin";
import { rateLimit } from "@/lib/security/rate-limit";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_MAX = Number(process.env.EMBED_MANIFEST_RATE_LIMIT_MAX ?? "600");
const RATE_LIMIT_WINDOW_MS = Number(process.env.EMBED_MANIFEST_RATE_LIMIT_WINDOW_MS ?? "60_000");

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
  if (domains.length > 0 && (!host || !domains.includes(host))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const config = playerConfig.config && typeof playerConfig.config === "object" ? { ...(playerConfig.config as Record<string, unknown>) } : {};
  if (Number(config.radius) === 12) config.radius = 0;
  delete config.assetUrls;

  return NextResponse.json(
    { id: playerConfig.id, videoId: playerConfig.video_id, config },
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
