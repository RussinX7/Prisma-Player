import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  const params = new URL(request.url).searchParams;
  const folderId = params.get("folderId");
  const status = params.get("status");
  const supabase = await createClient();
  let query = supabase.from("videos").select("id,title,folder_id,object_path,mime_type,size_bytes,status,duration_seconds,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(30);
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
    const { data: signed } = await supabase.storage.from("videos").createSignedUrl(video.object_path, 3600);
    const plays = new Set((playEvents ?? []).filter((event) => event.video_id === video.id).map((event) => event.session_id)).size;
    const player = (configs ?? []).find((config) => config.video_id === video.id);
    return { ...video, signed_url: signed?.signedUrl ?? null, plays, player_id: player?.id ?? null, published: Boolean(player?.published) };
  }));
  return NextResponse.json({ videos, nextCursor: data?.at(-1)?.created_at ?? null });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.objectPath !== "string" || !body.objectPath.startsWith(`${userId}/`)) return NextResponse.json({ error: "invalid_object_path" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").insert({ user_id: userId, folder_id: typeof body.folderId === "string" ? body.folderId : null, title: String(body.title ?? "Vídeo").trim().slice(0, 200), object_path: body.objectPath, mime_type: String(body.mimeType ?? "video/mp4"), size_bytes: Number(body.sizeBytes), status: "ready" }).select().single();
  if (error || !data) return NextResponse.json({ error: "video_create_failed" }, { status: 400 });
  const { data: player, error: playerError } = await supabase.from("player_configs").insert({ user_id: userId, video_id: data.id, config: {}, allowed_domains: [], published: true }).select("id").single();
  if (playerError) return NextResponse.json({ video: data, warning: "player_create_failed" }, { status: 201 });
  return NextResponse.json({ video: { ...data, player_id: player.id, published: true } }, { status: 201 });
}
