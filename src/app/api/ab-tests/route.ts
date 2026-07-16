import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const [{ data: tests, error }, { data: folders }, { data: events }] = await Promise.all([
    supabase.from("ab_tests").select("id,name,status,folder_id,created_at,ab_test_variants(id,video_id,weight,videos(title))").order("created_at", { ascending: false }),
    supabase.from("ab_test_folders").select("id,name,created_at").order("created_at", { ascending: false }),
    supabase.from("player_events").select("test_id,variant_id,session_id,event_type,progress_percent"),
  ]);
  if (error) return NextResponse.json({ error: "tests_load_failed" }, { status: 500 });
  const enriched = (tests ?? []).map((test) => ({ ...test, ab_test_variants: test.ab_test_variants.map((variant) => {
    const variantEvents = (events ?? []).filter((event) => event.variant_id === variant.id);
    const impressions = new Set(variantEvents.filter((event) => event.event_type === "impression").map((event) => event.session_id)).size;
    const plays = new Set(variantEvents.filter((event) => event.event_type === "play").map((event) => event.session_id)).size;
    const completed = new Set(variantEvents.filter((event) => event.event_type === "complete").map((event) => event.session_id)).size;
    const reached75 = new Set(variantEvents.filter((event) => event.event_type === "progress" && event.progress_percent >= 75).map((event) => event.session_id)).size;
    return { ...variant, metrics: { impressions, plays, completed, reached75, playRate: impressions ? plays / impressions * 100 : 0, completionRate: plays ? completed / plays * 100 : 0, retention75: plays ? reached75 / plays * 100 : 0 } };
  }) }));
  return NextResponse.json({ tests: enriched, folders: folders ?? [] });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: unknown; name?: unknown; folderId?: unknown; videoIds?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const supabase = await createClient();
  if (body?.type !== "folder") {
    const videoIds = Array.isArray(body?.videoIds) ? [...new Set(body.videoIds.filter((id): id is string => typeof id === "string"))].slice(0, 10) : [];
    if (videoIds.length < 2) return NextResponse.json({ error: "two_videos_required" }, { status: 400 });
    const { data: owned } = await supabase.from("videos").select("id").eq("user_id", userId).in("id", videoIds);
    if (owned?.length !== videoIds.length) return NextResponse.json({ error: "invalid_videos" }, { status: 400 });
    const { data: test, error: testError } = await supabase.from("ab_tests").insert({ user_id: userId, name: name.slice(0, 150), folder_id: typeof body?.folderId === "string" ? body.folderId : null, status: "active" }).select().single();
    if (testError || !test) return NextResponse.json({ error: "create_failed" }, { status: 400 });
    const baseWeight = Math.floor(100 / videoIds.length);
    const { error: variantsError } = await supabase.from("ab_test_variants").insert(videoIds.map((videoId, index) => ({ user_id: userId, test_id: test.id, video_id: videoId, weight: index === videoIds.length - 1 ? 100 - baseWeight * index : baseWeight })));
    if (variantsError) { await supabase.from("ab_tests").delete().eq("id", test.id); return NextResponse.json({ error: "variants_create_failed" }, { status: 400 }); }
    return NextResponse.json({ item: test }, { status: 201 });
  }
  const result = await supabase.from("ab_test_folders").insert({ user_id: userId, name: name.slice(0, 100) }).select().single();
  const { data, error } = result;
  return error ? NextResponse.json({ error: "create_failed" }, { status: 400 }) : NextResponse.json({ item: data }, { status: 201 });
}
