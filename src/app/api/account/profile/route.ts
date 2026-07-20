import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { csrfGuard } from "@/lib/security/csrf";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id,email,full_name,phone,avatar_url,locale,email_notifications,security_notifications,created_at").eq("id", userId).single();
  if (error) return NextResponse.json({ error: "profile_load_failed" }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const update = {
    full_name: typeof body.fullName === "string" ? body.fullName.trim().slice(0, 160) : undefined,
    phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : undefined,
    locale: ["pt-BR", "es", "en"].includes(String(body.locale)) ? body.locale : undefined,
    email_notifications: typeof body.emailNotifications === "boolean" ? body.emailNotifications : undefined,
    security_notifications: typeof body.securityNotifications === "boolean" ? body.securityNotifications : undefined,
    updated_at: new Date().toISOString(),
  };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").update(update).eq("id", userId).select().single();
  if (error) return NextResponse.json({ error: "profile_update_failed" }, { status: 500 });
  return NextResponse.json({ profile: data });
}
