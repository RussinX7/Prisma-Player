import { Activity, BrainCircuit, CircleDollarSign, CreditCard, Users, Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader, AdminMetric, AdminPanel, StatusPill } from "@/components/admin/AdminUi";

export const dynamic = "force-dynamic";
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function AdminPage() {
  const admin = createAdminClient();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [users, active, videos, paid, wallets, webhooks] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("videos").select("id", { count: "exact", head: true }),
    admin.from("billing_checkouts").select("amount_cents").eq("status", "paid").gte("paid_at", monthStart.toISOString()).limit(2000),
    admin.from("ai_credit_wallets").select("balance,lifetime_purchased,lifetime_used").limit(2000),
    admin.from("payment_webhook_events").select("provider_event_id,event_name,status,received_at,processing_error").order("received_at", { ascending: false }).limit(8),
  ]);
  const revenue = (paid.data ?? []).reduce((sum, item) => sum + item.amount_cents, 0);
  const creditBalance = (wallets.data ?? []).reduce((sum, item) => sum + item.balance, 0);
  const failedHooks = (webhooks.data ?? []).filter((item) => item.status === "failed").length;
  return <div>
    <AdminHeader title="Visão geral" description="Operação, receita, produto e entregas críticas acompanhadas em um único lugar." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <AdminMetric label="Contas" value={(users.count ?? 0).toLocaleString("pt-BR")} detail="usuários cadastrados" icon={Users} />
      <AdminMetric label="Assinaturas" value={(active.count ?? 0).toLocaleString("pt-BR")} detail="planos ativos" icon={CreditCard} tone="green" />
      <AdminMetric label="Receita no mês" value={money(revenue)} detail="checkouts confirmados" icon={CircleDollarSign} tone="green" />
      <AdminMetric label="VSLs" value={(videos.count ?? 0).toLocaleString("pt-BR")} detail="vídeos na plataforma" icon={Video} />
      <AdminMetric label="Créditos em carteira" value={creditBalance.toLocaleString("pt-BR")} detail="saldo dos clientes" icon={BrainCircuit} />
      <AdminMetric label="Alertas recentes" value={failedHooks.toLocaleString("pt-BR")} detail="webhooks com falha" icon={Activity} tone={failedHooks ? "red" : "green"} />
    </section>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <AdminPanel title="Entregas financeiras recentes" description="Eventos recebidos da AbacatePay e processados pela Prisma."><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[12px]"><thead className="themeable-bg-surface-pearl themeable-text-ink-muted-48"><tr><th className="px-5 py-3 font-medium">Evento</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Recebido</th><th className="px-5 py-3 font-medium">Diagnóstico</th></tr></thead><tbody>{(webhooks.data ?? []).map((item) => <tr key={item.provider_event_id} className="border-t themeable-border-hairline"><td className="px-5 py-3 font-medium themeable-text-ink">{item.event_name}</td><td className="px-5 py-3"><StatusPill value={item.status} /></td><td className="px-5 py-3 themeable-text-ink-muted-48">{new Date(item.received_at).toLocaleString("pt-BR")}</td><td className="max-w-[260px] truncate px-5 py-3 text-red-500">{item.processing_error ?? "—"}</td></tr>)}</tbody></table></div></AdminPanel>
      <AdminPanel title="Prioridades operacionais"><div className="space-y-3 p-5">{failedHooks > 0 ? <div className="rounded-[14px] border border-red-500/20 bg-red-500/5 p-4"><p className="text-[13px] font-semibold text-red-600">Revisar webhooks com falha</p><p className="mt-1 text-[11px] themeable-text-ink-muted-48">Pagamentos nunca devem depender de correção manual.</p></div> : <div className="rounded-[14px] border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-[13px] font-semibold text-emerald-600">Fluxo financeiro saudável</p><p className="mt-1 text-[11px] themeable-text-ink-muted-48">Nenhuma falha entre os eventos recentes.</p></div>}<div className="rounded-[14px] border p-4 themeable-border-hairline"><p className="text-[13px] font-semibold themeable-text-ink">Saldo Prisma IA</p><p className="mt-1 text-[11px] themeable-text-ink-muted-48">{creditBalance.toLocaleString("pt-BR")} créditos distribuídos nas carteiras.</p></div></div></AdminPanel>
    </div>
  </div>;
}
