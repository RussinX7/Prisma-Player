import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase.from("video_folders").delete().eq("id", id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "folder_delete_failed" }, { status: 400 }) : NextResponse.json({ ok: true });
}
