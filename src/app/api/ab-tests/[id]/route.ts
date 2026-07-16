import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase.from("ab_tests").delete().eq("id", id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "delete_failed" }, { status: 400 }) : NextResponse.json({ ok: true });
}
