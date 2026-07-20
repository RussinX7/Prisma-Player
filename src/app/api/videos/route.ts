import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbiddenForRole, getTeamAccountContext } from "@/lib/access/team-context";
import { isR2Configured, r2MaxUploadBytes, signR2ReadUrl } from "@/lib/storage/r2";
import { csrfGuard } from "@/lib/security/csrf";
import { getPostHogClient } from "@/lib/posthog-server";

function normalizeObjectPath(value: unknown, userId: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\\0") || trimmed.includes("\\") || trimmed.startsWith("/") || trimmed.startsWith("../") || trimmed.includes("/../") || trimmed.endsWith("/..") || trimmed === "..") return null;
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== userId || parts.some((part) => part === "." || part === ".." || !part)) return null;
  return trimmed;
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  const params = new URL(request.url).searchParams;
  const folderId = params.get("folderId");
  const status = params.get("status");
  const account = await getTeamAccountContext(userId);
  const supabase = createAdminClient();
  let query = supabase.from("videos").select("id,title,folder_id,object_path,mime_type,size_bytes,status,duration_seconds,created_at,storage_provider").eq("user_id", account.accountOwnerId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(30);
  if (cursor) query = query.lt("created_at", cursor);
  if (folderId) query = query.eq("folder_id", folderId);
  if (status && ["draft", "processing", "ready"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "videos_load_failed" }, { status: 500 });
  const ids = (data ?? []).map((video) => video.id);
  const [{ data: playEvents }, { data: configs }] = ids.length ? await Promise.all([
    supabase.from("video_events").select("video_id,session_id").in("video_id", ids).eq("event_type", "play"),
    supabase.from("player_configs").select("id,video_id,published").in("video_id", ids),
  ]) : [{ data: [] }, { data: [] }];
  const videos = await Promise.all((data ?? []).map(async (video) => {
    const signedUrl = video.status === "ready"
      ? video.storage_provider === "r2"
        ? await signR2ReadUrl(video.object_path, 3600).catch(() => null)
        : (await supabase.storage.from("videos").createSignedUrl(video.object_path, 3600)).data?.signedUrl ?? null
      : null;
    const plays = new Set((playEvents ?? []).filter((event) => event.video_id === video.id).map((event) => event.session_id)).size;
    const player = (configs ?? []).find((config) => config.video_id === video.id);
    return { ...video, signed_url: signedUrl, plays, player_id: player?.id ?? null, published: Boolean(player?.published) };
  }));
  return NextResponse.json({ videos, nextCursor: data?.at(-1)?.created_at ?? null });
}

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return forbiddenForRole();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const objectPath = normalizeObjectPath(body?.objectPath, userId);
  if (!body || !objectPath) return NextResponse.json({ error: "invalid_object_path" }, { status: 400 });
  const supabase = createAdminClient();
  const sizeBytes = Number(body.sizeBytes);
  const storageProvider = isR2Configured() ? "r2" : "supabase";
  const maxBytes = storageProvider === "r2" ? r2MaxUploadBytes() : 5 * 1024 ** 3;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) return NextResponse.json({ error: "invalid_file_size", maxBytes }, { status: 422 });
  const title = String(body.title ?? "Vídeo").trim().replace(/\s+/g, " ").slice(0, 200);
  const mimeType = String(body.mimeType || "video/mp4").trim().toLowerCase();
  const supportedMime = mimeType.startsWith("video/") || mimeType === "application/vnd.apple.mpegurl";
  if (!title) return NextResponse.json({ error: "invalid_title" }, { status: 422 });
  if (!supportedMime || mimeType.length > 100) return NextResponse.json({ error: "invalid_mime_type" }, { status: 415 });
  const requestedStatus = body.status === "processing" ? "processing" : "ready";
  const folderId = typeof body.folderId === "string" ? body.folderId : null;
  if (folderId) {
    const folder = await supabase.from("video_folders").select("id").eq("id", folderId).eq("user_id", account.accountOwnerId).maybeSingle();
    if (!folder.data) return NextResponse.json({ error: "folder_not_found" }, { status: 404 });
  }
  const { data, error } = await supabase.from("videos").insert({ user_id: account.accountOwnerId, folder_id: folderId, title, object_path: objectPath, mime_type: mimeType, size_bytes: sizeBytes, status: requestedStatus, storage_provider: storageProvider }).select().single();
  if (error || !data) return NextResponse.json({ error: "video_create_failed" }, { status: 400 });
  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: userId,
    event: "video_created",
    properties: { storage_provider: storageProvider, mime_type: mimeType, size_bytes: sizeBytes, status: requestedStatus },
  });
  await posthog.flush();
  if (requestedStatus === "processing") return NextResponse.json({ video: data }, { status: 201, headers: { Location: `/api/videos/${data.id}` } });
  const { data: player, error: playerError } = await supabase.from("player_configs").insert({ user_id: account.accountOwnerId, video_id: data.id, config: {}, allowed_domains: [], published: true }).select("id").single();
  if (playerError) return NextResponse.json({ video: data, warning: "player_create_failed" }, { status: 201 });
  return NextResponse.json({ video: { ...data, player_id: player.id, published: true } }, { status: 201, headers: { Location: `/api/videos/${data.id}` } });
}
