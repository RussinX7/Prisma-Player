import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBillingCheckout } from "@/lib/billing/service";
import type { BillingPlan } from "@/lib/billing/catalog";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { plan?: unknown; method?: unknown } | null;
  const slug = typeof body?.plan === "string" ? body.plan : "";
  const method = body?.method === "pix" || body?.method === "card" ? body.method : null;
  if (!slug || !method) return NextResponse.json({ error: "invalid_checkout" }, { status: 400 });

  const admin = createAdminClient();
  const planResult = await admin.from("billing_plans").select("*").eq("slug", slug).eq("is_active", true).single();
  if (planResult.error || !planResult.data) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

  try {
    const checkout = await createBillingCheckout(userId, planResult.data as BillingPlan, method === "pix" ? "pix" : "card_subscription");
    return NextResponse.json(checkout, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("AbacatePay checkout failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "checkout_provider_failed" }, { status: 502 });
  }
}
