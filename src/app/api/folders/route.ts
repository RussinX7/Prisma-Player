import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { csrfGuard } from "@/lib/security/csrf";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbiddenForRole, getTeamAccountContext } from "@/lib/access/team-context";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("video_folders").select("id,name,created_at").eq("user_id", account.accountOwnerId).order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: "folders_load_failed" }, { status: 500 }) : NextResponse.json({ folders: data });
}

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return forbiddenForRole();
  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("video_folders").insert({ user_id: account.accountOwnerId, name }).select().single();
  return error ? NextResponse.json({ error: "folder_create_failed" }, { status: 400 }) : NextResponse.json({ folder: data }, { status: 201 });
}
