import { Check, Sparkles } from "lucide-react";
import Nav from "@/features/marketing/components/Nav";
import Footer from "@/features/marketing/components/Footer";
import CheckoutActions from "@/features/billing/components/CheckoutActions";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, sharedFeatures, type BillingPlan } from "@/lib/billing/catalog";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("billing_plans").select("*").eq("is_active", true).order("display_order");
  const plans = (data ?? []) as BillingPlan[];

  return <><Nav /><main className="min-h-screen themeable-bg-canvas-parchment px-5 pb-20 pt-28">
    <section className="mx-auto max-w-6xl text-center"><div className="inline-flex items-center gap-2 rounded-full bg-prisma-blue/10 px-3 py-1.5 text-[12px] font-semibold text-prisma-blue"><Sparkles size={14} />Planos Prisma</div><h1 className="mt-5 text-[clamp(36px,6vw,64px)] font-semibold leading-[1.02] tracking-[-2px] themeable-text-ink">Escolha o volume.<br />Leve toda a tecnologia.</h1><p className="mx-auto mt-5 max-w-2xl text-[17px] themeable-text-ink-muted-48">Todos os planos incluem as ferramentas de personalizacao, conversao e analytics. Voce escolhe apenas a capacidade da operacao.</p></section>
    <section className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`relative rounded-[24px] border p-6 themeable-bg-canvas themeable-border-hairline ${plan.is_featured ? "ring-2 ring-prisma-blue" : ""}`}>{plan.is_featured && <span className="absolute right-5 top-5 rounded-full bg-prisma-blue px-3 py-1 text-[11px] font-semibold text-white">Mais escolhido</span>}<p className="text-[15px] font-semibold themeable-text-ink">{plan.name}</p><p className="mt-3 min-h-10 text-[13px] leading-relaxed themeable-text-ink-muted-48">{plan.description}</p><div className="mt-6 flex items-end gap-1"><strong className="text-[38px] leading-none tracking-[-1.5px] themeable-text-ink">{formatBRL(plan.amount_cents)}</strong><span className="text-[13px] themeable-text-ink-muted-48">/mes</span></div><ul className="mt-6 space-y-3 text-[13px] themeable-text-ink">{sharedFeatures.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-prisma-blue" />{feature}</li>)}<li className="flex gap-2"><Check size={16} className="shrink-0 text-prisma-blue" />{plan.included_plays.toLocaleString("pt-BR")} plays incluidos</li><li className="flex gap-2"><Check size={16} className="shrink-0 text-prisma-blue" />{plan.storage_gb} GB para sua biblioteca</li><li className="flex gap-2"><Check size={16} className="shrink-0 text-prisma-blue" />{plan.prisma_ai_analyses} analises Prisma IA</li></ul><CheckoutActions plan={plan.slug} /></article>)}</section>
  </main><Footer /></>;
}
