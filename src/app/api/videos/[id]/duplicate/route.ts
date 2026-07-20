import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbiddenForRole, getTeamAccountContext } from "@/lib/access/team-context";
import { copyR2Object, deleteR2Object } from "@/lib/storage/r2";
import { csrfGuard } from "@/lib/security/csrf";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return forbiddenForRole();
  const { id } = await context.params;
  const supabase = createAdminClient();
  const { data: original } = await supabase.from("videos").select("title,folder_id,object_path,mime_type,size_bytes,duration_seconds,storage_provider").eq("id", id).eq("user_id", account.accountOwnerId).eq("status", "ready").maybeSingle();
  if (!original) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const extension = original.object_path.includes(".") ? `.${original.object_path.split(".").pop()}` : "";
  const objectPath = `${userId}/${crypto.randomUUID()}-copy${extension}`;
  const cleanup = async () => original.storage_provider === "r2"
    ? deleteR2Object(objectPath).catch(() => undefined)
    : supabase.storage.from("videos").remove([objectPath]);

  if (original.storage_provider === "r2") {
    try { await copyR2Object(original.object_path, objectPath, original.mime_type); }
    catch { return NextResponse.json({ error: "video_copy_failed" }, { status: 500 }); }
  } else {
    const { error: copyError } = await supabase.storage.from("videos").copy(original.object_path, objectPath);
    if (copyError) return NextResponse.json({ error: "video_copy_failed" }, { status: 500 });
  }

  const { data, error } = await supabase.from("videos").insert({
    user_id: account.accountOwnerId, title: `${original.title} (cópia)`.slice(0, 200), folder_id: original.folder_id,
    object_path: objectPath, mime_type: original.mime_type, size_bytes: original.size_bytes,
    duration_seconds: original.duration_seconds, status: "ready", storage_provider: original.storage_provider,
  }).select("id").single();
  if (error) { await cleanup(); return NextResponse.json({ error: "video_duplicate_failed" }, { status: 500 }); }
  const { error: playerError } = await supabase.from("player_configs").insert({ user_id: account.accountOwnerId, video_id: data.id, config: {}, allowed_domains: [], published: true });
  if (playerError) {
    await supabase.from("videos").delete().eq("id", data.id).eq("user_id", account.accountOwnerId);
    await cleanup();
    return NextResponse.json({ error: "player_duplicate_failed" }, { status: 500 });
  }
  return NextResponse.json({ video: data }, { status: 201 });
}
