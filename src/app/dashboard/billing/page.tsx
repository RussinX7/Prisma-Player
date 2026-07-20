import { Check, CreditCard, Info, QrCode } from "lucide-react";
import Image from "next/image";
import Header from "@/components/dashboard/Header";
import CancelSubscriptionButton from "@/features/billing/components/CancelSubscriptionButton";
import CheckoutActions from "@/features/billing/components/CheckoutActions";
import AiCreditCheckoutButton from "@/features/billing/components/AiCreditCheckoutButton";
import { requireUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatPlayOverage, formatStorageOverage, getPlanBenefits, type BillingPlan } from "@/lib/billing/catalog";
import { getAccountAccess } from "@/lib/access/service";
import { reconcilePendingAiCreditCheckouts } from "@/lib/billing/ai-credit-reconcile";
export const dynamic = "force-dynamic";
export default async function BillingPage() {
  const userId = await requireUser("/dashboard/billing"); const admin = createAdminClient();
  await reconcilePendingAiCreditCheckouts(userId).catch((error) => console.error("Credit reconciliation failed", error instanceof Error ? error.message : "unknown_error"));
  const [subscriptionResult, plansResult, creditsResult, walletResult, access] = await Promise.all([
    admin.from("subscriptions").select("status,billing_method,current_period_end,cancelled_at,plan:billing_plans(slug,name,amount_cents)").eq("user_id", userId).maybeSingle(),
    admin.from("billing_plans").select("*").eq("is_active", true).order("display_order"),
    admin.from("ai_credit_products").select("*").eq("is_active", true).order("display_order"),
    admin.from("ai_credit_wallets").select("balance").eq("user_id", userId).maybeSingle(), getAccountAccess(userId),
  ]);
  const subscription = subscriptionResult.data; const plan = Array.isArray(subscription?.plan) ? subscription.plan[0] : subscription?.plan;
  const planOrder = ["prisma-prime", "prisma-growth", "prisma-scale"];
  const currentPlanIndex = plan ? planOrder.indexOf(plan.slug) : -1;
  return <><main className="dashboard-content"><div><h1 className="text-[28px] font-semibold tracking-[-.7px] themeable-text-ink">Plano e pagamentos</h1><p className="mt-1 text-[14px] themeable-text-ink-muted-48">Teste gratis, assinatura e creditos da Prisma IA em um so lugar.</p></div>
  <section className="mt-6 rounded-[20px] border p-5 themeable-bg-canvas themeable-border-hairline">{subscription?.status === "active" ? <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="rounded-full bg-green-500/10 px-3 py-1 text-[11px] font-semibold uppercase text-green-600">Plano ativo</span><h2 className="mt-3 text-[22px] font-semibold themeable-text-ink">{plan?.name ?? "Plano Prisma"}</h2><p className="text-[13px] themeable-text-ink-muted-48">Valido ate {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : "a proxima renovacao"}</p></div><div className="flex items-center gap-3"><span className="flex items-center gap-2 rounded-full themeable-bg-surface-pearl px-4 py-2 text-[13px] themeable-text-ink">{subscription.billing_method === "card" ? <CreditCard size={17} /> : <QrCode size={17} />}{subscription.billing_method === "card" ? "Cartao recorrente" : "Pix 30 dias"}</span>{subscription.billing_method === "card" && <CancelSubscriptionButton />}</div></div> : access.trialStatus === "active" ? <div><span className="rounded-full bg-prisma-blue/10 px-3 py-1 text-[11px] font-semibold text-prisma-blue">TESTE ATIVO</span><h2 className="mt-3 text-[22px] font-semibold themeable-text-ink">Acesso completo liberado</h2><p className="text-[13px] themeable-text-ink-muted-48">Seu teste termina em {access.trialEndsAt ? new Date(access.trialEndsAt).toLocaleDateString("pt-BR") : "14 dias"}. Nenhuma cobranca sera feita automaticamente.</p></div> : <div><h2 className="text-[20px] font-semibold themeable-text-ink">Escolha seu acesso</h2><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Cartao renova automaticamente. Pix libera 30 dias sem renovacao.</p></div>}</section>
  <h2 className="mt-9 text-[21px] font-semibold themeable-text-ink">Planos Prisma</h2>
  <p className="mt-1 text-[13px] themeable-text-ink-muted-48">Todos os planos recebem o player completo. Você escolhe apenas a capacidade ideal para sua operação.</p>
  <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-3">{(plansResult.data as BillingPlan[] ?? []).map((item) => {
    const isCurrentPlan = subscription?.status === "active" && plan?.slug === item.slug;
    return <article key={item.id} className={`relative flex min-h-full flex-col rounded-[22px] border p-6 themeable-bg-canvas themeable-border-hairline ${item.is_featured ? "ring-2 ring-prisma-blue" : ""}`}>
      {item.is_featured && <span className="absolute right-5 top-5 rounded-full bg-prisma-blue px-3 py-1 text-[10px] font-semibold text-white">Mais escolhido</span>}
      <p className="pr-24 text-[15px] font-semibold themeable-text-ink">{item.name}</p>
      <p className="mt-3 min-h-10 text-[12px] leading-relaxed themeable-text-ink-muted-48">{item.description}</p>
      <p className="mt-5 text-[34px] font-semibold tracking-[-1px] themeable-text-ink">{formatBRL(item.amount_cents)}<span className="ml-1 text-[12px] font-normal tracking-normal themeable-text-ink-muted-48">/mês</span></p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border p-3 themeable-border-hairline"><p className="flex items-center gap-1.5 text-[11px] themeable-text-ink-muted-48">Plays <OverageInfo text={`Após o limite: ${formatPlayOverage(item.play_overage_millicents)} por play.`} /></p><strong className="mt-1 block text-[14px] themeable-text-ink">{item.included_plays.toLocaleString("pt-BR")}/mês</strong></div>
        <div className="rounded-[14px] border p-3 themeable-border-hairline"><p className="flex items-center gap-1.5 text-[11px] themeable-text-ink-muted-48">Armazenamento <OverageInfo text={`Após o limite: ${formatStorageOverage(item.storage_overage_cents_per_gb)} por GB/mês.`} /></p><strong className="mt-1 block text-[14px] themeable-text-ink">{item.storage_gb.toLocaleString("pt-BR")} GB</strong><p className="mt-1 text-[10px] leading-4 themeable-text-ink-muted-48">Excedente: {formatStorageOverage(item.storage_overage_cents_per_gb)}/GB</p></div>
      </div>
      <div className="mt-5 flex-1 space-y-3">{getPlanBenefits(item).filter((feature) => !feature.includes("plays incluídos") && !feature.includes("GB na biblioteca") && !feature.includes("play excedente") && !feature.includes("GB excedente")).map((feature) => <p key={feature} className="flex items-start gap-2 text-[12px] leading-relaxed themeable-text-ink"><Check size={15} className="mt-0.5 shrink-0 text-prisma-blue" />{feature}</p>)}</div>
      {isCurrentPlan ? <div className="mt-6 rounded-xl bg-green-500/10 px-4 py-3 text-center text-[12px] font-semibold text-green-600">Seu plano atual</div> : <CheckoutActions plan={item.slug} change={currentPlanIndex < 0 ? "subscribe" : planOrder.indexOf(item.slug) > currentPlanIndex ? "upgrade" : "downgrade"} />}
    </article>;
  })}</div>
  <div className="mt-10 flex items-end justify-between"><div><h2 className="flex items-center gap-3 text-[21px] font-semibold themeable-text-ink"><Image src="/prisma-credits.png" width={42} height={42} alt="Créditos Prisma" className="h-10 w-10 object-contain" />Créditos Prisma IA</h2><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Saldo atual: <strong className="text-prisma-blue">{walletResult.data?.balance ?? 0} créditos</strong>. Os créditos não expiram.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-3">{(creditsResult.data ?? []).map((item) => <article key={item.id} className={`relative overflow-hidden rounded-[20px] border p-5 themeable-bg-canvas themeable-border-hairline ${item.is_featured ? "ring-2 ring-prisma-blue" : ""}`}><Image src="/prisma-credits.png" width={66} height={66} alt="" aria-hidden="true" className="absolute right-3 top-3 h-14 w-14 object-contain opacity-90" /><p className="pr-16 text-[15px] font-semibold themeable-text-ink">{item.name}</p><p className="mt-3 text-[26px] font-semibold themeable-text-ink">{item.credits + item.bonus_credits} <span className="text-[12px] font-normal themeable-text-ink-muted-48">créditos</span></p>{item.bonus_credits > 0 && <p className="text-[11px] font-semibold text-green-600">+{item.bonus_credits} de bônus incluídos</p>}<p className="mt-4 text-[19px] font-semibold themeable-text-ink">{formatBRL(item.amount_cents)}</p><AiCreditCheckoutButton product={item.slug} /></article>)}</div></main></>;
}

function OverageInfo({ text }: { text: string }) {
  return <span className="group relative inline-flex">
    <button type="button" aria-label={text} className="grid size-5 place-items-center rounded-full text-current outline-none transition hover:bg-prisma-blue/10 hover:text-prisma-blue focus-visible:ring-2 focus-visible:ring-prisma-blue"><Info size={13} /></button>
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-[#1d1d1f] px-3 py-2 text-[11px] font-medium leading-4 text-white shadow-xl group-hover:block group-focus-within:block">{text}</span>
  </span>;
}
