import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const checkoutId = new URL(request.url).searchParams.get("checkout");
  if (!checkoutId) return NextResponse.json({ error: "checkout_required" }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: checkout }, { data: subscription }] = await Promise.all([
    admin.from("billing_checkouts").select("id,status,checkout_type,paid_at,receipt_url,plan:billing_plans(name,slug)").eq("id", checkoutId).eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("status,billing_method,current_period_end,plan:billing_plans(name,slug)").eq("user_id", userId).maybeSingle(),
  ]);
  if (!checkout) return NextResponse.json({ error: "checkout_not_found" }, { status: 404 });
  return NextResponse.json({ checkout, subscription }, { headers: { "cache-control": "no-store" } });
}
