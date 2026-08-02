import { Check, CreditCard, Info, QrCode } from "lucide-react";
import Image from "next/image";
import PageHeader from "@/components/dashboard/PageHeader";
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
  const userId = await requireUser("/dashboard/billing");
  const admin = createAdminClient();
  await reconcilePendingAiCreditCheckouts(userId).catch((error) => console.error("Credit reconciliation failed", error instanceof Error ? error.message : "unknown_error"));
  const [subscriptionResult, plansResult, creditsResult, walletResult, access] = await Promise.all([
    admin.from("subscriptions").select("status,billing_method,current_period_end,cancelled_at,plan:billing_plans(slug,name,amount_cents)").eq("user_id", userId).maybeSingle(),
    admin.from("billing_plans").select("*").eq("is_active", true).order("display_order"),
    admin.from("ai_credit_products").select("*").eq("is_active", true).order("display_order"),
    admin.from("ai_credit_wallets").select("balance").eq("user_id", userId).maybeSingle(), getAccountAccess(userId),
  ]);
  const subscription = subscriptionResult.data;
  const plan = Array.isArray(subscription?.plan) ? subscription.plan[0] : subscription?.plan;
  const planOrder = ["prisma-prime", "prisma-growth", "prisma-scale"];
  const currentPlanIndex = plan ? planOrder.indexOf(plan.slug) : -1;

  return (
    <main className="dashboard-content pb-16 space-y-8">
      <PageHeader
        icon={<CreditCard size={20} />}
        title="Plano, Faturamento & Créditos"
      />

      <section className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-8 shadow-[6px_6px_0px_#191A23]">
        {subscription?.status === "active" ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black uppercase text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                Plano ativo
              </span>
              <h2 className="mt-3 text-3xl font-black text-[#191A23]">{plan?.name ?? "Plano Prisma Pro"}</h2>
              <p className="text-xs font-medium text-[#191A23]/70 mt-1">
                Válido até {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : "a próxima renovação"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border-2 border-[#191A23] bg-[#F3F3F3] px-4 py-2 text-xs font-bold text-[#191A23]">
                {subscription.billing_method === "card" ? <CreditCard size={17} /> : <QrCode size={17} />}
                {subscription.billing_method === "card" ? "Cartão recorrente" : "Pix 30 dias"}
              </span>
              {subscription.billing_method === "card" && <CancelSubscriptionButton />}
            </div>
          </div>
        ) : access.trialStatus === "active" ? (
          <div>
            <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
              TESTE 14 DIAS ATIVO
            </span>
            <h2 className="mt-3 text-3xl font-black text-[#191A23]">Acesso completo liberado</h2>
            <p className="text-xs font-medium text-[#191A23]/70 mt-1">
              Seu teste termina em {access.trialEndsAt ? new Date(access.trialEndsAt).toLocaleDateString("pt-BR") : "14 dias"}. Nenhuma cobrança automática.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-[#191A23]">Escolha o plano ideal para sua operação</h2>
            <p className="mt-1 text-xs font-medium text-[#191A23]/70">
              Cartão renova automaticamente. Pix libera 30 dias sem renovação forçada.
            </p>
          </div>
        )}
      </section>

      <div>
        <h2 className="text-2xl font-black text-[#191A23]">Planos Prisma Player</h2>
        <p className="mt-1 text-xs font-medium text-[#191A23]/70">
          Todos os planos recebem o player completo com turbo CDN e pitch delay.
        </p>

        <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-3">
          {(plansResult.data as BillingPlan[] ?? []).map((item) => {
            const isCurrentPlan = subscription?.status === "active" && plan?.slug === item.slug;
            return (
              <article
                key={item.id}
                className={`relative flex min-h-full flex-col rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-8 shadow-[6px_6px_0px_#191A23] ${
                  item.is_featured ? "bg-[#B9FF66]/10" : ""
                }`}
              >
                {item.is_featured && (
                  <span className="absolute right-6 top-6 rounded-full border border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-[10px] font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                    Mais Escolhido
                  </span>
                )}
                <p className="pr-24 text-xl font-black text-[#191A23]">{item.name}</p>
                <p className="mt-2 min-h-10 text-xs font-medium text-[#191A23]/70 leading-relaxed">{item.description}</p>
                <p className="mt-4 text-4xl font-black text-[#191A23] font-mono tracking-tight">
                  {formatBRL(item.amount_cents)}
                  <span className="ml-1 text-xs font-bold text-[#191A23]/60">/mês</span>
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#191A23]/60">
                      Plays <OverageInfo text={`Após o limite: ${formatPlayOverage(item.play_overage_millicents)} por play.`} />
                    </p>
                    <strong className="mt-1 block text-sm font-black text-[#191A23]">{item.included_plays.toLocaleString("pt-BR")}/mês</strong>
                  </div>
                  <div className="rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[#191A23]/60">
                      Storage <OverageInfo text={`Após o limite: ${formatStorageOverage(item.storage_overage_cents_per_gb)} por GB/mês.`} />
                    </p>
                    <strong className="mt-1 block text-sm font-black text-[#191A23]">{item.storage_gb.toLocaleString("pt-BR")} GB</strong>
                  </div>
                </div>

                <div className="mt-6 flex-1 space-y-3">
                  {getPlanBenefits(item)
                    .filter((feature) => !feature.includes("plays incluídos") && !feature.includes("GB na biblioteca") && !feature.includes("play excedente") && !feature.includes("GB excedente"))
                    .map((feature) => (
                      <p key={feature} className="flex items-start gap-2 text-xs font-bold text-[#191A23]">
                        <Check size={16} className="mt-0.5 shrink-0 text-[#191A23]" />
                        {feature}
                      </p>
                    ))}
                </div>

                {isCurrentPlan ? (
                  <div className="mt-6 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] p-3 text-center text-xs font-black text-[#191A23] shadow-[2px_2px_0px_#191A23]">
                    Seu plano atual
                  </div>
                ) : (
                  <div className="mt-6">
                    <CheckoutActions plan={item.slug} change={currentPlanIndex < 0 ? "subscribe" : planOrder.indexOf(item.slug) > currentPlanIndex ? "upgrade" : "downgrade"} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <div className="pt-6">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black text-[#191A23]">
            <Image src="/prisma-credits.png" width={42} height={42} alt="Créditos Prisma" className="h-9 w-9 object-contain" />
            Créditos Prisma IA
          </h2>
          <p className="mt-1 text-xs font-medium text-[#191A23]/70">
            Saldo atual: <strong className="font-black text-[#191A23] underline">{walletResult.data?.balance ?? 0} créditos</strong>. Os créditos não expiram.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {(creditsResult.data ?? []).map((item) => (
            <article
              key={item.id}
              className="relative overflow-hidden rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] space-y-3"
            >
              <Image src="/prisma-credits.png" width={66} height={66} alt="" aria-hidden="true" className="absolute right-4 top-4 h-12 w-12 object-contain opacity-90" />
              <p className="pr-16 text-base font-black text-[#191A23]">{item.name}</p>
              <p className="text-3xl font-black text-[#191A23]">
                {item.credits + item.bonus_credits} <span className="text-xs font-bold text-[#191A23]/60">créditos</span>
              </p>
              {item.bonus_credits > 0 && (
                <p className="text-xs font-black text-[#191A23] bg-[#B9FF66] border border-[#191A23] rounded-full px-3 py-0.5 w-fit">
                  +{item.bonus_credits} de bônus incluídos
                </p>
              )}
              <p className="text-2xl font-black text-[#191A23] font-mono">{formatBRL(item.amount_cents)}</p>
              <AiCreditCheckoutButton product={item.slug} />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function OverageInfo({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={text} className="grid size-4 place-items-center rounded-full text-[#191A23] outline-none">
        <Info size={13} />
      </button>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-2xl border-2 border-[#191A23] bg-[#191A23] p-3 text-[11px] font-bold leading-relaxed text-white shadow-2xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
