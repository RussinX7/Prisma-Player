import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_folders").select("id,name,created_at").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: "folders_load_failed" }, { status: 500 }) : NextResponse.json({ folders: data });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_folders").insert({ user_id: userId, name }).select().single();
  return error ? NextResponse.json({ error: "folder_create_failed" }, { status: 400 }) : NextResponse.json({ folder: data }, { status: 201 });
}
