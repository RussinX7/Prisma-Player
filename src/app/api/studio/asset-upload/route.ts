import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamAccountContext } from "@/lib/access/team-context";
import { csrfGuard } from "@/lib/security/csrf";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KINDS = new Set(["thumbnailStart", "thumbnailPause", "thumbnailEnd", "headlineDesktop", "headlineMobile", "captions"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "text/vtt"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  const videoId = String(form.get("videoId") ?? "");
  const kind = String(form.get("kind") ?? "");
  if (!uuid.test(videoId) || !ALLOWED_KINDS.has(kind)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  const contentType = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(contentType)) return NextResponse.json({ error: "unsupported_mime_type" }, { status: 415 });

  // Valida que o video pertence a esta conta antes de qualquer escrita no bucket.
  const admin = createAdminClient();
  const { data: ownedVideo } = await admin.from("videos").select("id").eq("id", videoId).eq("user_id", account.accountOwnerId).maybeSingle();
  if (!ownedVideo) return NextResponse.json({ error: "video_not_found" }, { status: 404 });

  // Path montado server-side: {ownerId}/{videoId}/{kind}-{uuid}.{ext}.
  // O {kind} mantem legibilidade para o editor; o {uuid} impede colisao e nao
  // expoe sequencias previsiveis para outros usuarios mesmo se a RLS falhar.
  const ext = (file.name.split(".").pop() || "").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const path = `${account.accountOwnerId}/${videoId}/${kind}-${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("player-assets").upload(path, buffer, { contentType, cacheControl: "31536000", upsert: false });
  if (error) {
    console.error("player-asset upload failed", { videoId, kind, message: error.message });
    return NextResponse.json({ error: "asset_upload_failed" }, { status: 500 });
  }
  return NextResponse.json({ path }, { status: 201, headers: { "cache-control": "no-store" } });
}
