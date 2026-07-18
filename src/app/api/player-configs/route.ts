import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "invalid_video_id" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("player_configs").select("id, config, allowed_domains, published, updated_at").eq("video_id", videoId).eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "config_load_failed" }, { status: 400 });
  if (data && data.config && typeof data.config === "object" && Number((data.config as Record<string, unknown>).radius) === 12) {
    const config = { ...(data.config as Record<string, unknown>), radius: 0 };
    await supabase.from("player_configs").update({ config, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", userId);
    return NextResponse.json({ playerConfig: { ...data, config } });
  }
  return NextResponse.json({ playerConfig: data });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { videoId?: unknown; config?: unknown; domains?: unknown } | null;
  if (typeof body?.videoId !== "string" || !body.config || typeof body.config !== "object") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  if (JSON.stringify(body.config).length > 100_000) return NextResponse.json({ error: "config_too_large" }, { status: 413 });
  const supabase = await createClient();
  const { data: ownedVideo } = await supabase.from("videos").select("id").eq("id", body.videoId).eq("user_id", userId).maybeSingle();
  if (!ownedVideo) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const domains = Array.isArray(body.domains) ? body.domains.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
  const config = { ...(body.config as Record<string, unknown>) };
  config.radius = Math.max(0, Math.min(28, Number(config.radius) || 0));
  config.progressHeight = Math.max(4, Math.min(12, Number(config.progressHeight) || 6));
  config.playbackRate = Math.max(0.75, Math.min(2, Number(config.playbackRate) || 1));
  config.ctaStart = Math.max(0, Number(config.ctaStart) || 0);
  config.ctaEnd = Math.max(0, Number(config.ctaEnd) || 0);
  const { data, error } = await supabase.from("player_configs").upsert({ user_id: userId, video_id: body.videoId, config, allowed_domains: domains, published: true, updated_at: new Date().toISOString() }, { onConflict: "video_id" }).select().single();
  if (error) return NextResponse.json({ error: "config_save_failed" }, { status: 400 });
  await supabase.from("videos").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", body.videoId).eq("user_id", userId);
  return NextResponse.json({ playerConfig: data });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { videoId?: unknown } | null;
  if (typeof body?.videoId !== "string") return NextResponse.json({ error: "invalid_video_id" }, { status: 400 });
  const supabase = await createClient();
  const { data: ownedVideo } = await supabase.from("videos").select("id").eq("id", body.videoId).eq("user_id", userId).maybeSingle();
  if (!ownedVideo) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
  const { data: existing } = await supabase.from("player_configs").select("id,published").eq("video_id", body.videoId).eq("user_id", userId).maybeSingle();
  if (existing) {
    if (!existing.published) await supabase.from("player_configs").update({ published: true, updated_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", userId);
    return NextResponse.json({ playerConfig: { ...existing, published: true } });
  }
  const { data, error } = await supabase.from("player_configs").insert({ user_id: userId, video_id: body.videoId, config: {}, allowed_domains: [], published: true }).select("id,published").single();
  return error ? NextResponse.json({ error: "player_create_failed" }, { status: 400 }) : NextResponse.json({ playerConfig: data }, { status: 201 });
}
