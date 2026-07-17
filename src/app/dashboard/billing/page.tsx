import Link from "next/link";
import { CreditCard, QrCode } from "lucide-react";
import Header from "@/components/dashboard/Header";
import CancelSubscriptionButton from "@/features/billing/components/CancelSubscriptionButton";
import { requireUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const userId = await requireUser("/dashboard/billing");
  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("status,billing_method,current_period_end,cancelled_at,plan:billing_plans(name,amount_cents)").eq("user_id", userId).maybeSingle();
  const plan = Array.isArray(subscription?.plan) ? subscription.plan[0] : subscription?.plan;
  return <><Header /><main className="dashboard-content"><div className="mb-6"><h1 className="text-[28px] font-semibold tracking-[-.7px] themeable-text-ink">Plano e pagamentos</h1><p className="mt-1 text-[14px] themeable-text-ink-muted-48">Gerencie seu acesso sem expor dados bancarios a Prisma.</p></div><section className="max-w-2xl rounded-[18px] border p-6 themeable-bg-canvas themeable-border-hairline">{subscription ? <><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-green-500/10 px-3 py-1 text-[11px] font-semibold uppercase text-green-600">{subscription.status}</span><h2 className="mt-4 text-[24px] font-semibold themeable-text-ink">{plan?.name ?? "Plano Prisma"}</h2><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Valido ate {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : "confirmacao do pagamento"}</p></div><div className="flex items-center gap-2 rounded-full themeable-bg-surface-pearl px-4 py-2 text-[13px] themeable-text-ink">{subscription.billing_method === "card" ? <CreditCard size={17} /> : <QrCode size={17} />}{subscription.billing_method === "card" ? "Cartao recorrente" : "Pix por 30 dias"}</div></div><div className="mt-6 border-t pt-5 themeable-border-hairline">{subscription.billing_method === "card" && subscription.status === "active" ? <CancelSubscriptionButton /> : <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-full bg-prisma-blue px-5 text-[13px] font-semibold text-white">Renovar ou trocar plano</Link>}</div></> : <><h2 className="text-[20px] font-semibold themeable-text-ink">Nenhum plano ativo</h2><p className="mt-2 text-[14px] themeable-text-ink-muted-48">Escolha Pix por 30 dias ou cartao com renovacao automatica.</p><Link href="/pricing" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-prisma-blue px-5 text-[13px] font-semibold text-white">Ver planos</Link></>}</section></main></>;
}
