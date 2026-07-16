import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: video, error: videoError } = await supabase.from("videos").select("id,object_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (videoError || !video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });

  const { data: playerConfig } = await supabase.from("player_configs").select("config").eq("video_id", id).eq("user_id", userId).maybeSingle();
  const config = playerConfig?.config && typeof playerConfig.config === "object" ? playerConfig.config as Record<string, unknown> : {};
  const assets = config.assets && typeof config.assets === "object" ? Object.values(config.assets as Record<string, unknown>).filter((path): path is string => typeof path === "string" && path.startsWith(`${userId}/`)) : [];

  if (assets.length) {
    const { error: assetError } = await supabase.storage.from("player-assets").remove(assets);
    if (assetError) return NextResponse.json({ error: "player_assets_delete_failed" }, { status: 500 });
  }
  const { error: videoStorageError } = await supabase.storage.from("videos").remove([video.object_path]);
  if (videoStorageError) return NextResponse.json({ error: "video_file_delete_failed" }, { status: 500 });
  const { error: deleteError } = await supabase.from("videos").delete().eq("id", id).eq("user_id", userId);
  return deleteError ? NextResponse.json({ error: "video_delete_failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}
