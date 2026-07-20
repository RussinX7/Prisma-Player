import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { csrfGuard } from "@/lib/security/csrf";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbiddenForRole, getTeamAccountContext } from "@/lib/access/team-context";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const account = await getTeamAccountContext(userId);
  if (!account.canEditContent) return forbiddenForRole();
  const { id } = await context.params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("video_folders").delete().eq("id", id).eq("user_id", account.accountOwnerId);
  return error ? NextResponse.json({ error: "folder_delete_failed" }, { status: 400 }) : NextResponse.json({ ok: true });
}
