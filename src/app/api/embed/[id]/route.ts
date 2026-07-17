import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeHost(value: string) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return ""; }
}

function domainAllowed(host: string, domains: string[]) {
  if (domains.length === 0) return true;
  return domains.some((domain) => {
    const clean = domain.toLowerCase().replace(/^\*\./, "");
    return host === clean || (domain.startsWith("*.") && host.endsWith(`.${clean}`));
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  const supabase = createAdminClient();
  const fields = "id,video_id,config,allowed_domains,published";
  const byPlayerId = await supabase.from("player_configs").select(fields).eq("id", id).eq("published", true).maybeSingle();
  if (byPlayerId.error) {
    console.error("embed player lookup failed", { code: byPlayerId.error.code, message: byPlayerId.error.message });
    return NextResponse.json({ error: "player_lookup_failed", code: byPlayerId.error.code || "supabase_rejected" }, { status: 503 });
  }
  let playerConfig = byPlayerId.data;
  if (!playerConfig) {
    const byVideoId = await supabase.from("player_configs").select(fields).eq("video_id", id).eq("published", true).maybeSingle();
    if (byVideoId.error) {
      console.error("embed video config lookup failed", { code: byVideoId.error.code, message: byVideoId.error.message });
      return NextResponse.json({ error: "player_lookup_failed", code: byVideoId.error.code || "supabase_rejected" }, { status: 503 });
    }
    playerConfig = byVideoId.data;
  }

  if (!playerConfig) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const requestedSite = new URL(request.url).searchParams.get("site") ?? "";
  const host = normalizeHost(requestedSite || request.headers.get("referer") || request.headers.get("origin") || "");
  const domains = Array.isArray(playerConfig.allowed_domains) ? playerConfig.allowed_domains.map((domain) => domain.trim()).filter(Boolean) : [];
  if (domains.length > 0 && (!host || !domainAllowed(host, domains))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const { data: video } = await supabase.from("videos").select("id,title,object_path,mime_type,user_id").eq("id", playerConfig.video_id).eq("status", "ready").maybeSingle();
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const { data: signed, error } = await supabase.storage.from("videos").createSignedUrl(video.object_path, 900);
  if (error || !signed) return NextResponse.json({ error: "source_unavailable" }, { status: 503 });

  const config = playerConfig.config && typeof playerConfig.config === "object" ? { ...playerConfig.config } as Record<string, unknown> : {};
  if (Number(config.radius) === 12) config.radius = 0;
  const assets = config.assets && typeof config.assets === "object" ? config.assets as Record<string, unknown> : {};
  const assetUrls: Record<string, string> = {};
  await Promise.all(Object.entries(assets).map(async ([kind, path]) => {
    if (typeof path !== "string") return;
    const { data } = await supabase.storage.from("player-assets").createSignedUrl(path, 900);
    if (data?.signedUrl) assetUrls[kind] = data.signedUrl;
  }));
  config.assetUrls = assetUrls;

  return NextResponse.json({ id: playerConfig.id, videoId: playerConfig.video_id, title: video.title, source: signed.signedUrl, type: video.mime_type, config }, { headers: { "cache-control": "private, no-store, max-age=0", "x-robots-tag": "noindex, nofollow, noarchive" } });
}
