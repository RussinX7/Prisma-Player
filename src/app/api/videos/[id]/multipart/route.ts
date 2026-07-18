import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { abortR2MultipartUpload, completeR2MultipartUpload, createR2MultipartUpload, describeR2Error, signR2UploadPart } from "@/lib/storage/r2";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = body?.action;
  const supabase = await createClient();
  const { data: video } = await supabase.from("videos").select("id,object_path,mime_type,size_bytes,status,storage_provider").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!video || video.storage_provider !== "r2") return NextResponse.json({ error: "video_not_found" }, { status: 404 });

  try {
    if (action === "create") {
      if (video.status !== "processing") return NextResponse.json({ error: "invalid_status" }, { status: 409 });
      const uploadId = await createR2MultipartUpload(video.object_path, video.mime_type, { owner: userId, video: video.id });
      return NextResponse.json({ uploadId, partSize: 25 * 1024 * 1024 });
    }
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";
    if (!uploadId || uploadId.length > 1024) return NextResponse.json({ error: "invalid_upload_id" }, { status: 422 });
    if (action === "sign") {
      const partNumber = Number(body?.partNumber);
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) return NextResponse.json({ error: "invalid_part_number" }, { status: 422 });
      return NextResponse.json({ url: await signR2UploadPart(video.object_path, uploadId, partNumber) });
    }
    if (action === "abort") {
      await abortR2MultipartUpload(video.object_path, uploadId);
      await supabase.from("videos").update({ status: "failed" }).eq("id", id).eq("user_id", userId);
      return NextResponse.json({ ok: true });
    }
    if (action === "complete") {
      const rawParts = Array.isArray(body?.parts) ? body.parts : [];
      const parts = rawParts.map((part) => ({ ETag: String((part as Record<string, unknown>).etag ?? ""), PartNumber: Number((part as Record<string, unknown>).partNumber) }));
      if (!parts.length || parts.length > 10000 || parts.some((part) => !part.ETag || !Number.isInteger(part.PartNumber))) return NextResponse.json({ error: "invalid_parts" }, { status: 422 });
      const head = await completeR2MultipartUpload(video.object_path, uploadId, parts.sort((a, b) => a.PartNumber - b.PartNumber));
      if (Number(head.ContentLength) !== Number(video.size_bytes)) return NextResponse.json({ error: "uploaded_size_mismatch" }, { status: 409 });
      const durationSeconds = Number(body?.durationSeconds);
      await supabase.from("videos").update({ status: "ready", duration_seconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : null }).eq("id", id).eq("user_id", userId);
      await supabase.from("player_configs").upsert({ user_id: userId, video_id: id, config: {}, allowed_domains: [], published: true }, { onConflict: "video_id", ignoreDuplicates: true });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    const diagnostic = describeR2Error(error);
    console.error("r2 multipart operation failed", {
      action,
      videoId: id,
      code: diagnostic.providerCode,
      status: diagnostic.status,
      requestId: diagnostic.requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: diagnostic.code }, { status: 502 });
  }
}
