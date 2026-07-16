import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: original } = await supabase.from("videos").select("title,folder_id,object_path,mime_type,size_bytes,duration_seconds").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!original) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const extension = original.object_path.includes(".") ? `.${original.object_path.split(".").pop()}` : "";
  const objectPath = `${userId}/${crypto.randomUUID()}-copy${extension}`;
  const { error: copyError } = await supabase.storage.from("videos").copy(original.object_path, objectPath);
  if (copyError) return NextResponse.json({ error: "video_copy_failed" }, { status: 500 });
  const { data, error } = await supabase.from("videos").insert({ user_id: userId, title: `${original.title} (cópia)`.slice(0, 200), folder_id: original.folder_id, object_path: objectPath, mime_type: original.mime_type, size_bytes: original.size_bytes, duration_seconds: original.duration_seconds, status: "ready" }).select("id").single();
  if (error) { await supabase.storage.from("videos").remove([objectPath]); return NextResponse.json({ error: "video_duplicate_failed" }, { status: 500 }); }
  return NextResponse.json({ video: data }, { status: 201 });
}
