import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";
import { csrfGuard } from "@/lib/security/csrf";
import { hashRateLimitIdentifier, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const limited = await rateLimit(request, "auth-login", { max: 10, windowMs: 10 * 60_000, failClosed: true });
  if (limited) return limited;

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  const accountLimited = await rateLimit(request, "auth-login-account", {
    max: 15, windowMs: 30 * 60_000, failClosed: true, identifier: hashRateLimitIdentifier(email),
  });
  if (accountLimited) return accountLimited;

  const supabase = await createClient();
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) {
    const message = getAuthErrorMessage(result.error, "Não foi possível entrar agora. Tente novamente.");
    return NextResponse.json({ error: "auth_failed", message }, { status: 401 });
  }
  const { data } = await supabase.auth.getUser();
  return NextResponse.json({ user: data.user });
}
