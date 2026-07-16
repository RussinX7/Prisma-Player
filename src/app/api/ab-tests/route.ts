import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const [{ data: tests, error }, { data: folders }] = await Promise.all([
    supabase.from("ab_tests").select("id,name,status,folder_id,created_at,ab_test_variants(count)").order("created_at", { ascending: false }),
    supabase.from("ab_test_folders").select("id,name,created_at").order("created_at", { ascending: false }),
  ]);
  return error ? NextResponse.json({ error: "tests_load_failed" }, { status: 500 }) : NextResponse.json({ tests, folders: folders ?? [] });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: unknown; name?: unknown; folderId?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const supabase = await createClient();
  const result = body?.type === "folder"
    ? await supabase.from("ab_test_folders").insert({ user_id: userId, name: name.slice(0, 100) }).select().single()
    : await supabase.from("ab_tests").insert({ user_id: userId, name: name.slice(0, 150), folder_id: typeof body?.folderId === "string" ? body.folderId : null }).select().single();
  const { data, error } = result;
  return error ? NextResponse.json({ error: "create_failed" }, { status: 400 }) : NextResponse.json({ item: data }, { status: 201 });
}
