import Link from "next/link";
import { Activity, ArrowRight, BarChart3, BellRing, BrainCircuit, FileClock, Radio, Webhook } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { requireUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const userId = await requireUser("/dashboard/intelligence");
  const admin = createAdminClient();
  const [subscription, videos, events] = await Promise.all([
    admin.from("subscriptions").select("plan:billing_plans(slug,name,automatic_reports,audience_sync,outgoing_webhooks,private_benchmark,portfolio_comparison,conversion_drop_alerts)").eq("user_id", userId).eq("status", "active").maybeSingle(),
    admin.from("videos").select("id,title,status").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("video_events").select("video_id,session_id,event_type,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50000),
  ]);
  const plan = Array.isArray(subscription.data?.plan) ? subscription.data.plan[0] : subscription.data?.plan;
  const rows = events.data ?? [];
  const performance = (videos.data ?? []).map((video) => {
    const own = rows.filter((row) => row.video_id === video.id);
    const count = (type: string) => new Set(own.filter((row) => row.event_type === type).map((row) => row.session_id)).size;
    const impressions = count("impression"), plays = count("play"), conversions = count("conversion"), completes = count("complete");
    return { ...video, impressions, plays, conversions, completion: plays ? Math.round(completes / plays * 1000) / 10 : 0, conversion: plays ? Math.round(conversions / plays * 1000) / 10 : 0 };
  }).sort((a, b) => b.conversion - a.conversion);
  const features = [
    { icon: FileClock, title: "Relatórios automáticos", detail: "Resumos recorrentes com evolução, perdas e oportunidades.", enabled: Boolean(plan?.automatic_reports), minimum: "Prime Growth" },
    { icon: Radio, title: "Audience Sync", detail: "Públicos de remarketing por retenção e etapa do funil.", enabled: Boolean(plan?.audience_sync), minimum: "Prime Growth" },
    { icon: Webhook, title: "Webhooks", detail: "Eventos da operação enviados aos seus sistemas.", enabled: Boolean(plan?.outgoing_webhooks), minimum: "Prime Growth" },
    { icon: BarChart3, title: "Benchmark privado", detail: "Compare sua própria evolução sem expor dados para terceiros.", enabled: Boolean(plan?.private_benchmark), minimum: "Prime Scale" },
    { icon: Activity, title: "Comparação global de VSLs", detail: "Ranking unificado de retenção e conversão do portfólio.", enabled: Boolean(plan?.portfolio_comparison), minimum: "Prime Scale" },
    { icon: BellRing, title: "Alertas de queda", detail: "Sinais inteligentes quando a conversão foge do padrão.", enabled: Boolean(plan?.conversion_drop_alerts), minimum: "Prime Scale" },
  ];
  return <><Header /><main className="dashboard-content"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-[.14em] text-prisma-blue">Central de inteligência</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-.7px] themeable-text-ink">Decisões para escalar sua operação</h1><p className="mt-1 max-w-2xl text-[14px] themeable-text-ink-muted-48">Compare VSLs e organize automações sem transformar os dados em uma tela confusa.</p></div><span className="rounded-full bg-prisma-blue/10 px-4 py-2 text-[12px] font-semibold text-prisma-blue">{plan?.name ?? "Sem plano"}</span></div>
    <section className="mt-7 rounded-[22px] border themeable-bg-canvas themeable-border-hairline"><div className="flex items-center gap-3 border-b p-5 themeable-border-hairline"><BrainCircuit className="text-prisma-blue" size={21} /><div><h2 className="text-[17px] font-semibold themeable-text-ink">Comparação da operação</h2><p className="text-[12px] themeable-text-ink-muted-48">Dados reais do período disponível coletados pelas embeds.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[12px]"><thead className="themeable-bg-surface-pearl themeable-text-ink-muted-48"><tr><th className="px-5 py-3">VSL</th><th className="px-5 py-3">Visualizações</th><th className="px-5 py-3">Plays</th><th className="px-5 py-3">Retenção final</th><th className="px-5 py-3">Conversão</th><th className="px-5 py-3" /></tr></thead><tbody>{performance.map((video, index) => <tr key={video.id} className="border-t themeable-border-hairline"><td className="px-5 py-4"><span className="mr-2 text-prisma-blue">#{index + 1}</span><strong className="themeable-text-ink">{video.title}</strong></td><td className="px-5 py-4 themeable-text-ink">{video.impressions}</td><td className="px-5 py-4 themeable-text-ink">{video.plays}</td><td className="px-5 py-4 themeable-text-ink">{video.completion}%</td><td className="px-5 py-4 font-semibold text-prisma-blue">{video.conversion}%</td><td className="px-5 py-4"><Link href={`/dashboard/analytics/${video.id}`} className="inline-flex items-center gap-1 font-semibold text-prisma-blue">Analisar <ArrowRight size={14} /></Link></td></tr>)}{!performance.length && <tr><td colSpan={6} className="px-5 py-16 text-center themeable-text-ink-muted-48">Publique sua primeira VSL para iniciar a comparação.</td></tr>}</tbody></table></div></section>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{features.map(({ icon: Icon, ...feature }) => <article key={feature.title} className="rounded-[20px] border p-5 themeable-bg-canvas themeable-border-hairline"><div className="flex items-start justify-between gap-4"><span className={`grid h-10 w-10 place-items-center rounded-[12px] ${feature.enabled ? "bg-prisma-blue/10 text-prisma-blue" : "bg-black/5 themeable-text-ink-muted-48"}`}><Icon size={19} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${feature.enabled ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>{feature.enabled ? "Disponível" : feature.minimum}</span></div><h3 className="mt-5 text-[16px] font-semibold themeable-text-ink">{feature.title}</h3><p className="mt-2 text-[12px] leading-relaxed themeable-text-ink-muted-48">{feature.detail}</p></article>)}</div>
  </main></>;
}
