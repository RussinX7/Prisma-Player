import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamAccountContext } from "@/lib/access/team-context";
import { csrfGuard } from "@/lib/security/csrf";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KINDS = new Set(["thumbnailStart", "thumbnailPause", "thumbnailEnd", "headlineDesktop", "headlineMobile", "captions"]);

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { videoId?: unknown; assets?: unknown } | null;
  const videoId = typeof body?.videoId === "string" ? body.videoId : "";
  if (!uuid.test(videoId)) return NextResponse.json({ error: "invalid_video_id" }, { status: 400 });
  const assets = body?.assets && typeof body.assets === "object" ? body.assets as Record<string, unknown> : {};
  const entries = Object.entries(assets).filter(([kind, path]) => ALLOWED_KINDS.has(kind) && typeof path === "string" && path.length > 0 && path.length <= 256).slice(0, Object.keys(assets).length);
  if (entries.length === 0) return NextResponse.json({ signedUrls: {} });

  // O bucket "player-assets" aplica RLS por owner_id; aqui usamos o admin client
  // para assinar URLs, mas limitamos a paths cuja primeira pasta coincide com o
  // account owner. Isso impede que um usuario autenticado assine assets de outro
  // workspace mesmo se a RLS do bucket fosse mal configurada no futuro.
  const ownerPrefix = `${account.accountOwnerId}/`;
  const safeEntries = entries.filter(([, path]) => (path as string).startsWith(ownerPrefix));
  if (safeEntries.length === 0) return NextResponse.json({ signedUrls: {} });

  const admin = createAdminClient();
  const results: Record<string, string> = {};
  await Promise.all(safeEntries.map(async ([kind, path]) => {
    const { data, error } = await admin.storage.from("player-assets").createSignedUrl(path as string, 3600);
    if (!error && data?.signedUrl) results[kind] = data.signedUrl;
  }));
  return NextResponse.json({ signedUrls: results }, { headers: { "cache-control": "private, no-store" } });
}
