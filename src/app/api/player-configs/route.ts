import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { videoId?: unknown; config?: unknown; domains?: unknown } | null;
  if (typeof body?.videoId !== "string" || !body.config || typeof body.config !== "object") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const supabase = await createClient();
  const { data: ownedVideo } = await supabase.from("videos").select("id").eq("id", body.videoId).eq("user_id", userId).maybeSingle();
  if (!ownedVideo) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const domains = Array.isArray(body.domains) ? body.domains.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
  const { data, error } = await supabase.from("player_configs").upsert({ user_id: userId, video_id: body.videoId, config: body.config, allowed_domains: domains, updated_at: new Date().toISOString() }, { onConflict: "video_id" }).select().single();
  return error ? NextResponse.json({ error: "config_save_failed" }, { status: 400 }) : NextResponse.json({ playerConfig: data });
}
