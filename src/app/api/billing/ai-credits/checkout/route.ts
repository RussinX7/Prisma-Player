import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAiCreditCheckout } from "@/lib/billing/ai-credits";
import { AbacatePayError } from "@/lib/billing/abacatepay/client";

export async function POST(request: Request) {
  const userId = await getCurrentUserId(); if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { product?: unknown } | null;
  if (typeof body?.product !== "string") return NextResponse.json({ error: "invalid_product" }, { status: 400 });
  const { data } = await createAdminClient().from("ai_credit_products").select("*").eq("slug", body.product).eq("is_active", true).maybeSingle();
  if (!data) return NextResponse.json({ error: "product_not_found" }, { status: 404 });
  try { return NextResponse.json(await createAiCreditCheckout(userId, data)); }
  catch (error) { console.error("AI credit checkout failed", error instanceof Error ? error.message : "unknown"); return NextResponse.json({ error: "checkout_provider_failed", message: error instanceof AbacatePayError && [401,403].includes(error.status) ? "A chave da AbacatePay nao possui as permissoes necessarias." : "Nao foi possivel abrir o checkout de creditos." }, { status: 502 }); }
}
