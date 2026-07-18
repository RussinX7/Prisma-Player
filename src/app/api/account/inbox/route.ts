import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().from("user_inbox").select("id,kind,title,message,action_label,action_url,read_at,created_at").eq("user_id", userId).is("dismissed_at", null).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "inbox_failed" }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "invalid_notification" }, { status: 400 });
  const { error } = await createAdminClient().from("user_inbox").update({ read_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "inbox_update_failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "invalid_notification" }, { status: 400 });
  const { error } = await createAdminClient().from("user_inbox").update({ dismissed_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", userId);
  return error ? NextResponse.json({ error: "inbox_delete_failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}
