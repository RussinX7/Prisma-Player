import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return String(data.claims.sub);
}

export async function requireUser(next = "/dashboard/videos") {
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return userId;
}

export async function getCurrentAdminUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const appRole = typeof data.user.app_metadata?.role === "string" ? data.user.app_metadata.role : "";
  return appRole === "admin" ? data.user : null;
}

export async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?next=${encodeURIComponent("/admin")}`);
  const user = await getCurrentAdminUser();
  if (!user) redirect("/dashboard/videos");
  const supabase = await createClient();
  const { data: assurance, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || assurance.currentLevel !== "aal2") {
    redirect("/dashboard/settings?section=security&adminMfa=required");
  }
  return user;
}
