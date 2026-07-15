import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  const supabase = await createClient();
  let query = supabase.from("videos").select("id,title,folder_id,object_path,mime_type,size_bytes,status,duration_seconds,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(30);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: "videos_load_failed" }, { status: 500 }) : NextResponse.json({ videos: data, nextCursor: data?.at(-1)?.created_at ?? null });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.objectPath !== "string" || !body.objectPath.startsWith(`${userId}/`)) return NextResponse.json({ error: "invalid_object_path" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").insert({ user_id: userId, folder_id: typeof body.folderId === "string" ? body.folderId : null, title: String(body.title ?? "Vídeo").trim().slice(0, 200), object_path: body.objectPath, mime_type: String(body.mimeType ?? "video/mp4"), size_bytes: Number(body.sizeBytes), status: "ready" }).select().single();
  return error ? NextResponse.json({ error: "video_create_failed" }, { status: 400 }) : NextResponse.json({ video: data }, { status: 201 });
}
