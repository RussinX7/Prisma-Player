const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabaseUrl() {
  if (!projectUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  return projectUrl;
}

export function getSupabasePublishableKey() {
  if (!publishableKey) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured");
  return publishableKey;
}

export function isSupabaseConfigured() {
  return Boolean(projectUrl && publishableKey);
}
