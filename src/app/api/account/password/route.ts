import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { rateLimit } from "@/lib/security/rate-limit";

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limited = await rateLimit(request, `account-password:${userId}`, { max: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return NextResponse.json({ error: "weak_password" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "password_update_failed" }, { status: 400 });
  await supabase.from("security_events").insert({ user_id: userId, event_type: "password_changed" });
  return NextResponse.json({ ok: true });
}
