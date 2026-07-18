import type { Metadata } from "next";
import MarketingLanding from "@/features/marketing/components/MarketingLanding";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const userId = await getCurrentUserId();
  const profile = userId
    ? (await createAdminClient().from("profiles").select("full_name").eq("id", userId).maybeSingle()).data
    : null;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Dashboard";
  return <MarketingLanding account={userId ? { firstName } : null} />;
}
