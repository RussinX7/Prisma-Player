import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function hash(value: string) { let result = 0; for (let index = 0; index < value.length; index += 1) result = ((result << 5) - result + value.charCodeAt(index)) >>> 0; return result; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const supabase = createAdminClient();
  const { data: test } = await supabase.from("ab_tests").select("id,status").eq("id", id).eq("status", "active").maybeSingle();
  if (!test) return NextResponse.json({ error: "test_not_found" }, { status: 404 });
  const { data: variants } = await supabase.from("ab_test_variants").select("id,video_id,weight").eq("test_id", id).order("id");
  if (!variants?.length) return NextResponse.json({ error: "variants_not_found" }, { status: 404 });
  const point = hash(`${id}:${sessionId}`) % 100;
  let cursor = 0;
  const variant = variants.find((item) => { cursor += item.weight; return point < cursor; }) ?? variants.at(-1)!;
  const { data: config } = await supabase.from("player_configs").select("id").eq("video_id", variant.video_id).eq("published", true).maybeSingle();
  if (!config) return NextResponse.json({ error: "variant_not_published" }, { status: 409 });
  return NextResponse.json({ testId: id, variantId: variant.id, videoId: variant.video_id, playerId: config.id }, { headers: { "cache-control": "private, no-store" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase.from("ab_tests").delete().eq("id", id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "delete_failed" }, { status: 400 }) : NextResponse.json({ ok: true });
}
