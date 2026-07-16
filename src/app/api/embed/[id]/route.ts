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
  const { data: playerConfig } = await supabase.from("player_configs").select("video_id, config, allowed_domains, published").eq("published", true).or(`id.eq.${id},video_id.eq.${id}`).maybeSingle();
  if (!playerConfig) return NextResponse.json({ error: "player_not_found" }, { status: 404 });

  const requestedSite = new URL(request.url).searchParams.get("site") ?? "";
  const host = normalizeHost(requestedSite || request.headers.get("referer") || request.headers.get("origin") || "");
  const domains = Array.isArray(playerConfig.allowed_domains) ? playerConfig.allowed_domains.map((domain) => domain.trim()).filter(Boolean) : [];
  if (domains.length > 0 && (!host || !domainAllowed(host, domains))) return NextResponse.json({ error: "domain_not_allowed" }, { status: 403 });

  const { data: video } = await supabase.from("videos").select("title, object_path, mime_type").eq("id", playerConfig.video_id).maybeSingle();
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

  return NextResponse.json({ id, videoId: playerConfig.video_id, title: video.title, source: signed.signedUrl, type: video.mime_type, config }, { headers: { "cache-control": "private, no-store, max-age=0", "x-robots-tag": "noindex, nofollow, noarchive" } });
}
