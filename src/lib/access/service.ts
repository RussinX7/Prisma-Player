import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountAccess = {
  onboardingCompleted: boolean;
  trialStatus: "available" | "active" | "used" | "expired";
  trialEndsAt: string | null;
  subscriptionActive: boolean;
  hasAccess: boolean;
};

export async function getAccountAccess(userId: string): Promise<AccountAccess> {
  const admin = createAdminClient();
  const [accessResult, subscriptionResult] = await Promise.all([
    admin.from("account_access").select("onboarding_completed,trial_status,trial_ends_at").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status,current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  const now = Date.now();
  const row = accessResult.data;
  const trialActive = row?.trial_status === "active" && Boolean(row.trial_ends_at) && new Date(row!.trial_ends_at!).getTime() > now;
  const subscriptionActive = subscriptionResult.data?.status === "active" && (!subscriptionResult.data.current_period_end || new Date(subscriptionResult.data.current_period_end).getTime() > now);
  return {
    onboardingCompleted: row?.onboarding_completed ?? true,
    trialStatus: (row?.trial_status as AccountAccess["trialStatus"]) ?? "used",
    trialEndsAt: row?.trial_ends_at ?? null,
    subscriptionActive,
    hasAccess: trialActive || subscriptionActive,
  };
}
