import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient(getSupabaseUrl(), secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
