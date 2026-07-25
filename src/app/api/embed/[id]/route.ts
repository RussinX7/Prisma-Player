import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmbedEventTokenSafely, domainAllowed, trustedEmbedHostFromHeaders, verifyEmbedOriginToken } from "@/lib/security/embed-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { signR2ReadUrl } from "@/lib/storage/r2";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMBED_CONFIG_RATE_LIMIT_MAX = Number(process.env.EMBED_CONFIG_RATE_LIMIT_MAX ?? "300");
const EMBED_CONFIG_RATE_LIMIT_WINDOW_MS = Number(process.env.EMBED_CONFIG_RATE_LIMIT_WINDOW_MS ?? "60_000");

function requestDevice(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/android|iphone|mobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

function csvValues(value: unknown) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const limited = await rateLimit(request, `embed-config:${id}`, { max: EMBED_CONFIG_RATE_LIMIT_MAX, windowMs: EMBED_CONFIG_RATE_LIMIT_WINDOW_MS });
  if (limited) return limited;

  const supabase = createAdminClient();
  const fields = "id,video_id,config,allowed_domains,published";
  const byPlayerId = await supabase.from("player_configs").select(fields).eq("id", id).eq("published", true).maybeSingle();
  if (byPlayerId.error) {
    console.error("embed player lookup failed", { code: byPlayerId.error.code, message: byPlayerId.error.message });
    return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
  }
  let playerConfig = byPlayerId.data;
  if (!playerConfig) {
    const byVideoId = await supabase.from("player_configs").select(fields).eq("video_id", id).eq("published", true).maybeSingle();
    if (byVideoId.error) {
      console.error("embed video config lookup failed", { code: byVideoId.error.code, message: byVideoId.error.message });
      return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
    }
    playerConfig = byVideoId.data;
  }

  if (!playerConfig) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const originToken = new URL(request.url).searchParams.get("originToken");
  const verifiedOrigin = verifyEmbedOriginToken(originToken, playerConfig.id) || verifyEmbedOriginToken(originToken, id);
  const host = verifiedOrigin?.host || trustedEmbedHostFromHeaders(request.headers);
  const domains = Array.isArray(playerConfig.allowed_domains) ? playerConfig.allowed_domains.map((domain) => domain.trim()).filter(Boolean) : [];
  if (domains.length > 0 && (!verifiedOrigin || !host || !domainAllowed(host, domains))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const config = playerConfig.config && typeof playerConfig.config === "object" ? { ...playerConfig.config } as Record<string, unknown> : {};
  if (Boolean(config.trafficEnabled)) {
    const countryPolicy = String(config.allowedCountries || "Todos").trim().toLowerCase();
    if (countryPolicy === "nenhum") return NextResponse.json({ error: "country_not_allowed" }, { status: 403 });
    const allowedCountries = csvValues(config.allowedCountries).filter((item) => item !== "todos");
    const country = (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").toLowerCase();
    if (allowedCountries.length > 0 && (!country || !allowedCountries.includes(country))) return NextResponse.json({ error: "country_not_allowed" }, { status: 403 });

    const allowedDevices = Array.isArray(config.allowedDevices) ? config.allowedDevices.filter((item): item is string => typeof item === "string") : [];
    if (allowedDevices.length > 0 && !allowedDevices.includes(requestDevice(request.headers.get("user-agent") || ""))) return NextResponse.json({ error: "device_not_allowed" }, { status: 403 });

    const requestedLanguage = String(config.browserLanguage || "Todos").toLowerCase();
    const acceptedLanguage = (request.headers.get("accept-language") || "").toLowerCase();
    const languagePrefix = requestedLanguage === "português" ? "pt" : requestedLanguage === "inglês" ? "en" : requestedLanguage === "espanhol" ? "es" : "";
    if (languagePrefix && !acceptedLanguage.includes(languagePrefix)) return NextResponse.json({ error: "language_not_allowed" }, { status: 403 });
  }

  const { data: video } = await supabase.from("videos").select("id,title,object_path,mime_type,user_id,storage_provider").eq("id", playerConfig.video_id).eq("status", "ready").maybeSingle();
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const source = video.storage_provider === "r2"
    ? await signR2ReadUrl(video.object_path, 1800).catch(() => null)
    : (await supabase.storage.from("videos").createSignedUrl(video.object_path, 900)).data?.signedUrl ?? null;
  if (!source) return NextResponse.json({ error: "source_unavailable" }, { status: 503 });

  if (Number(config.radius) === 12) config.radius = 0;
  const assets = config.assets && typeof config.assets === "object" ? config.assets as Record<string, unknown> : {};
  const assetUrls: Record<string, string> = {};
  await Promise.all(Object.entries(assets).map(async ([kind, path]) => {
    if (typeof path !== "string") return;
    const { data } = await supabase.storage.from("player-assets").createSignedUrl(path, 900);
    if (data?.signedUrl) assetUrls[kind] = data.signedUrl;
  }));
  config.assetUrls = assetUrls;

  return NextResponse.json({ id: playerConfig.id, videoId: playerConfig.video_id, title: video.title, source, type: video.mime_type, config, eventToken: createEmbedEventTokenSafely(video.id) }, { headers: { "cache-control": "private, no-store, max-age=0", "x-robots-tag": "noindex, nofollow, noarchive", "cloudflare-cdn-cache": "no-store" } });
}
