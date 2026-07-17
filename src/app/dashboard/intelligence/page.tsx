import Link from "next/link";
import { ArrowRight, BrainCircuit, Target, Zap } from "lucide-react";
import Header from "@/components/dashboard/Header";
import IntelligenceControls from "@/features/intelligence/components/IntelligenceControls";
import { requireUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type VideoRow = { id: string; title: string; status: string };
type EventRow = { video_id: string; session_id: string; event_type: string; progress_percent: number };

function percent(value: number, total: number) { return total ? Math.round(value / total * 1000) / 10 : 0; }

export default async function IntelligencePage() {
  const userId = await requireUser("/dashboard/intelligence");
  const admin = createAdminClient();
  const [subscription, videos, events, wallet] = await Promise.all([
    admin.from("subscriptions").select("plan:billing_plans(slug,name,automatic_reports,audience_sync,outgoing_webhooks,private_benchmark,portfolio_comparison,conversion_drop_alerts)").eq("user_id", userId).eq("status", "active").maybeSingle(),
    admin.from("videos").select("id,title,status").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("video_events").select("video_id,session_id,event_type,progress_percent").eq("user_id", userId).order("created_at", { ascending: false }).limit(50000),
    admin.from("ai_credit_wallets").select("balance").eq("user_id", userId).maybeSingle(),
  ]);
  const plan = Array.isArray(subscription.data?.plan) ? subscription.data.plan[0] : subscription.data?.plan;
  const rows = (events.data ?? []) as EventRow[];
  const performance = ((videos.data ?? []) as VideoRow[]).map((video) => {
    const own = rows.filter((row) => row.video_id === video.id);
    const count = (type: string) => new Set(own.filter((row) => row.event_type === type).map((row) => row.session_id)).size;
    const reached = (point: number) => new Set(own.filter((row) => row.event_type === "complete" || (row.event_type === "progress" && row.progress_percent >= point)).map((row) => row.session_id)).size;
    const impressions = count("impression"), plays = count("play"), conversions = count("conversion"), completes = count("complete");
    return { ...video, impressions, plays, conversions, playRate: percent(plays, impressions), pitch: percent(reached(75), plays), completion: percent(completes, plays), conversion: percent(conversions, plays) };
  }).sort((a, b) => b.conversion - a.conversion || b.completion - a.completion);
  const totals = performance.reduce((sum, item) => ({ impressions: sum.impressions + item.impressions, plays: sum.plays + item.plays, conversions: sum.conversions + item.conversions }), { impressions: 0, plays: 0, conversions: 0 });
  const winner = performance[0];
  const score = Math.min(100, Math.round(percent(totals.plays, totals.impressions) * .45 + percent(totals.conversions, totals.plays) * 2.5 + (winner?.completion ?? 0) * .3));
  const actions = !totals.impressions ? [{ tone: "blue", title: "Comece pela coleta", detail: "Publique uma VSL e leve tráfego real para liberar diagnósticos confiáveis.", href: "/dashboard/videos" }] : [
    totals.plays / Math.max(totals.impressions, 1) < .35 ? { tone: "amber", title: "A abertura precisa de um experimento", detail: "Sua taxa de play está abaixo de 35%. Teste headline, thumbnail e autoplay antes de editar o roteiro.", href: winner ? `/dashboard/analytics/${winner.id}` : "/dashboard/videos" } : { tone: "green", title: "Abertura saudável", detail: "O início está convertendo visualizações em plays. Concentre o próximo teste na retenção até o pitch.", href: winner ? `/dashboard/analytics/${winner.id}` : "/dashboard/videos" },
    { tone: "blue", title: winner ? `Use ${winner.title} como controle` : "Escolha uma VSL controle", detail: winner ? `Ela lidera o portfólio com ${winner.conversion}% de conversão e ${winner.completion}% de retenção final.` : "Ainda não há volume suficiente para escolher uma vencedora.", href: winner ? `/dashboard/analytics/${winner.id}` : "/dashboard/videos" },
  ];
  const capabilities = {
    automatic_reports: Boolean(plan?.automatic_reports), audience_sync: Boolean(plan?.audience_sync),
    outgoing_webhooks: Boolean(plan?.outgoing_webhooks), private_benchmark: Boolean(plan?.private_benchmark),
    portfolio_comparison: Boolean(plan?.portfolio_comparison), conversion_drop_alerts: Boolean(plan?.conversion_drop_alerts),
  };

  return <><Header /><main className="dashboard-content pb-16">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-[.16em] text-prisma-blue">Prisma Intelligence</p><h1 className="mt-2 text-[30px] font-semibold tracking-[-.045em] themeable-text-ink">Seu centro de decisões</h1><p className="mt-1 max-w-2xl text-[14px] themeable-text-ink-muted-48">Sinais da operação transformados em prioridades, experimentos e próximos passos.</p></div><div className="flex gap-2"><span className="rounded-full border px-4 py-2 text-[12px] themeable-border-hairline themeable-text-ink">{wallet.data?.balance ?? 0} créditos IA</span><span className="rounded-full bg-prisma-blue px-4 py-2 text-[12px] font-semibold text-white">{plan?.name ?? "Sem plano"}</span></div></div>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <article className="rounded-[18px] border bg-white p-6 themeable-border-hairline dark:bg-[#1d1d1f] sm:p-8"><div className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#0066cc]"><BrainCircuit size={17} /> Saúde da operação</span><span className="text-[12px] themeable-text-ink-muted-48">30 dias</span></div><div className="mt-10 grid gap-7 sm:grid-cols-[120px_1fr]"><div><strong className="text-[56px] font-semibold leading-none tracking-[-.06em] themeable-text-ink">{score}</strong><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e8ed]"><span className="block h-full rounded-full bg-[#0066cc]" style={{ width: `${score}%` }} /></div><span className="mt-2 block text-[11px] themeable-text-ink-muted-48">de 100 pontos</span></div><div><h2 className="text-[28px] font-semibold leading-tight tracking-[-.035em] themeable-text-ink">{score >= 70 ? "Pronta para escalar" : score >= 40 ? "Bom sinal. Há espaço para evoluir." : "Primeiro, construa uma base confiável."}</h2><p className="mt-3 max-w-xl text-[14px] leading-6 themeable-text-ink-muted-48">Uma leitura direta de play rate, chegada ao pitch, retenção final e conversões.</p></div></div><div className="mt-9 grid grid-cols-3 gap-px overflow-hidden rounded-[11px] bg-[#e0e0e0]"><Mini label="Visualizações" value={totals.impressions} /><Mini label="Plays" value={totals.plays} /><Mini label="Conversões" value={totals.conversions} /></div></article>
      <article className="rounded-[28px] border p-6 themeable-bg-canvas themeable-border-hairline"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-prisma-blue/10 text-prisma-blue"><Target size={21} /></span><div><h2 className="font-semibold themeable-text-ink">Foco recomendado</h2><p className="text-[12px] themeable-text-ink-muted-48">O que merece atenção agora</p></div></div><div className="mt-6 space-y-3">{actions.map((action) => <Link href={action.href} key={action.title} className="group block rounded-[20px] border p-4 transition hover:-translate-y-0.5 hover:border-prisma-blue themeable-border-hairline"><div className="flex gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${action.tone === "amber" ? "bg-amber-500" : action.tone === "green" ? "bg-emerald-500" : "bg-prisma-blue"}`} /><div><h3 className="font-semibold themeable-text-ink">{action.title}</h3><p className="mt-1 text-[12px] leading-5 themeable-text-ink-muted-48">{action.detail}</p><span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-prisma-blue">Abrir análise <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span></div></div></Link>)}</div></article>
    </section>

    <section id="portfolio" className="mt-5 overflow-hidden rounded-[18px] border themeable-bg-canvas themeable-border-hairline"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 themeable-border-hairline"><div><h2 className="text-[19px] font-semibold themeable-text-ink">Radar do portfólio</h2><p className="text-[12px] themeable-text-ink-muted-48">Compare alcance, retenção e resultado sem abrir relatório por relatório.</p></div><Link href="/dashboard/ab-tests" className="inline-flex items-center gap-2 rounded-full bg-prisma-blue px-4 py-2 text-[12px] font-semibold text-white"><Zap size={15} /> Criar experimento</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-[12px]"><thead className="bg-black/[.025] themeable-text-ink-muted-48"><tr><th className="px-5 py-3">Posição / VSL</th><th>Play rate</th><th>Chegada ao pitch</th><th>Retenção final</th><th>Conversão</th><th /></tr></thead><tbody>{performance.map((video, index) => <tr key={video.id} className="border-t themeable-border-hairline"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-8 place-items-center rounded-full text-[11px] font-bold ${index === 0 ? "bg-prisma-blue text-white" : "bg-black/5 themeable-text-ink"}`}>{index + 1}</span><div><strong className="block max-w-[260px] truncate themeable-text-ink">{video.title}</strong><span className="themeable-text-ink-muted-48">{video.impressions} visualizações</span></div></div></td><Metric value={video.playRate} /><Metric value={video.pitch} /><Metric value={video.completion} /><Metric value={video.conversion} strong /><td className="pr-5 text-right"><Link href={`/dashboard/analytics/${video.id}`} className="font-semibold text-prisma-blue">Detalhes</Link></td></tr>)}{!performance.length && <tr><td colSpan={6} className="px-5 py-16 text-center themeable-text-ink-muted-48">Suas VSLs aparecerão aqui assim que forem publicadas.</td></tr>}</tbody></table></div></section>

    <IntelligenceControls capabilities={capabilities} videoCount={performance.length} />
  </main></>;
}

function Mini({ label, value }: { label: string; value: number }) { return <div className="bg-[#fafafc] px-4 py-3 dark:bg-white/[.04]"><span className="block text-[10px] uppercase tracking-[.08em] themeable-text-ink-muted-48">{label}</span><strong className="mt-1 block text-xl themeable-text-ink">{value.toLocaleString("pt-BR")}</strong></div>; }
function Metric({ value, strong }: { value: number; strong?: boolean }) { return <td><span className={strong ? "font-bold text-prisma-blue" : "themeable-text-ink"}>{value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span><span className="ml-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-black/5 align-middle"><span className="block h-full rounded-full bg-prisma-blue" style={{ width: `${Math.min(100, value)}%` }} /></span></td>; }
