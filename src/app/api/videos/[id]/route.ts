import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteR2Object } from "@/lib/storage/r2";
import { csrfGuard } from "@/lib/security/csrf";
import { forbiddenForRole, getTeamAccountContext } from "@/lib/access/team-context";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return forbiddenForRole();
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.title === "string") {
    const title = body.title.trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    updates.title = title;
  }
  if (body && "folderId" in body) updates.folder_id = typeof body.folderId === "string" ? body.folderId : null;
  const supabase = createAdminClient();
  if (body?.status === "ready" || body?.status === "failed") {
    const { data: current } = await supabase.from("videos").select("object_path,status").eq("id", id).eq("user_id", account.accountOwnerId).maybeSingle();
    if (!current || current.status !== "processing") return NextResponse.json({ error: "invalid_status_transition" }, { status: 409 });
    if (body.status === "ready") {
      const separator = current.object_path.lastIndexOf("/");
      const folder = current.object_path.slice(0, separator);
      const fileName = current.object_path.slice(separator + 1);
      const { data: objects, error: storageError } = await supabase.storage.from("videos").list(folder, { search: fileName, limit: 2 });
      if (storageError || !objects?.some((object) => object.name === fileName)) return NextResponse.json({ error: "uploaded_file_not_found" }, { status: 409 });
      updates.status = "ready";
      const duration = Number(body.durationSeconds);
      if (Number.isFinite(duration) && duration > 0) updates.duration_seconds = duration;
    } else updates.status = "failed";
  }
  const { data, error } = await supabase.from("videos").update(updates).eq("id", id).eq("user_id", account.accountOwnerId).select("id,title,folder_id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "video_update_failed" }, { status: 400 });
  if (body?.status === "ready") await supabase.from("player_configs").upsert({ user_id: account.accountOwnerId, video_id: id, config: {}, allowed_domains: [], published: true }, { onConflict: "video_id", ignoreDuplicates: true });
  return NextResponse.json({ video: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canManageAccount) return forbiddenForRole();
  const { id } = await context.params;
  const supabase = createAdminClient();
  const { data: video, error: videoError } = await supabase.from("videos").select("id,object_path,storage_provider").eq("id", id).eq("user_id", account.accountOwnerId).maybeSingle();
  if (videoError || !video) return NextResponse.json({ error: "video_not_found" }, { status: 404 });

  const { data: playerConfig } = await supabase.from("player_configs").select("config").eq("video_id", id).eq("user_id", account.accountOwnerId).maybeSingle();
  const config = playerConfig?.config && typeof playerConfig.config === "object" ? playerConfig.config as Record<string, unknown> : {};
  const assets = config.assets && typeof config.assets === "object" ? Object.values(config.assets as Record<string, unknown>).filter((path): path is string => typeof path === "string" && path.startsWith(`${account.accountOwnerId}/`)) : [];

  if (assets.length) {
    const { error: assetError } = await supabase.storage.from("player-assets").remove(assets);
    if (assetError) return NextResponse.json({ error: "player_assets_delete_failed" }, { status: 500 });
  }
  if (video.storage_provider === "r2") {
    try { await deleteR2Object(video.object_path); } catch { return NextResponse.json({ error: "video_file_delete_failed" }, { status: 500 }); }
  } else {
    const { error: videoStorageError } = await supabase.storage.from("videos").remove([video.object_path]);
    if (videoStorageError) return NextResponse.json({ error: "video_file_delete_failed" }, { status: 500 });
  }
  const { error: deleteError } = await supabase.from("videos").delete().eq("id", id).eq("user_id", account.accountOwnerId);
  return deleteError ? NextResponse.json({ error: "video_delete_failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}
