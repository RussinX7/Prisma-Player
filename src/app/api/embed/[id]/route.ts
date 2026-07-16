import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  const supabase = createAdminClient();
  const fields = "id,video_id,config,allowed_domains,published";
  const byPlayerId = await supabase.from("player_configs").select(fields).eq("id", id).eq("published", true).maybeSingle();
  if (byPlayerId.error) return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
  let playerConfig = byPlayerId.data;
  if (!playerConfig) {
    const byVideoId = await supabase.from("player_configs").select(fields).eq("video_id", id).eq("published", true).maybeSingle();
    if (byVideoId.error) return NextResponse.json({ error: "player_lookup_failed" }, { status: 503 });
    playerConfig = byVideoId.data;
  }

  // Compatibilidade com códigos antigos que receberam o video_id antes da criação do player_config.
  let fallbackVideo: { id: string; title: string; object_path: string; mime_type: string; user_id: string } | null = null;
  if (!playerConfig) {
    const legacy = await supabase.from("videos").select("id,title,object_path,mime_type,user_id").eq("id", id).eq("status", "ready").maybeSingle();
    if (legacy.error) return NextResponse.json({ error: "video_lookup_failed" }, { status: 503 });
    fallbackVideo = legacy.data;
    if (!fallbackVideo) return NextResponse.json({ error: "player_not_found" }, { status: 404 });
    const created = await supabase.from("player_configs").insert({ user_id: fallbackVideo.user_id, video_id: fallbackVideo.id, config: {}, allowed_domains: [], published: true }).select(fields).maybeSingle();
    playerConfig = created.data ?? { id, video_id: fallbackVideo.id, config: {}, allowed_domains: [], published: true };
  }

  const requestedSite = new URL(request.url).searchParams.get("site") ?? "";
  const host = normalizeHost(requestedSite || request.headers.get("referer") || request.headers.get("origin") || "");
  const domains = Array.isArray(playerConfig.allowed_domains) ? playerConfig.allowed_domains.map((domain) => domain.trim()).filter(Boolean) : [];
  if (domains.length > 0 && (!host || !domainAllowed(host, domains))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const { data: loadedVideo } = fallbackVideo ? { data: fallbackVideo } : await supabase.from("videos").select("id,title,object_path,mime_type,user_id").eq("id", playerConfig.video_id).maybeSingle();
  const video = loadedVideo;
  if (!video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const { data: signed, error } = await supabase.storage.from("videos").createSignedUrl(video.object_path, 900);
  if (error || !signed) return NextResponse.json({ error: "source_unavailable" }, { status: 503 });

  const config = playerConfig.config && typeof playerConfig.config === "object" ? { ...playerConfig.config } as Record<string, unknown> : {};
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
