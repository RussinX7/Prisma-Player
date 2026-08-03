import Link from "next/link";
import { ArrowRight, BrainCircuit, Target, Zap } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
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
  const [subscription, videos, events, wallet, globalBenchmark] = await Promise.all([
    admin.from("subscriptions").select("plan:billing_plans(slug,name,automatic_reports,audience_sync,outgoing_webhooks,private_benchmark,portfolio_comparison,conversion_drop_alerts)").eq("user_id", userId).eq("status", "active").maybeSingle(),
    admin.from("videos").select("id,title,status").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("video_events").select("video_id,session_id,event_type,progress_percent").eq("user_id", userId).order("created_at", { ascending: false }).limit(50000),
    admin.from("ai_credit_wallets").select("balance").eq("user_id", userId).maybeSingle(),
    admin.rpc("get_global_video_benchmark"),
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
  const benchmarkData = {
    leader: winner ? { title: winner.title, completion: winner.completion, conversion: winner.conversion, playRate: winner.playRate } : null,
    average: {
      completion: performance.length ? Number((performance.reduce((s, i) => s + i.completion, 0) / performance.length).toFixed(1)) : 0,
      conversion: performance.length ? Number((performance.reduce((s, i) => s + i.conversion, 0) / performance.length).toFixed(1)) : 0,
      playRate: performance.length ? Number((performance.reduce((s, i) => s + i.playRate, 0) / performance.length).toFixed(1)) : 0,
    },
    videoCount: performance.length,
    global: (globalBenchmark.data ?? { qualified: false, sampleVideos: 0, samplePlays: 0, playRate: 0, completion: 0, conversion: 0 }) as { qualified: boolean; sampleVideos: number; samplePlays: number; playRate: number; completion: number; conversion: number },
  };

  return (
    <main className="dashboard-content pb-16 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={<BrainCircuit size={20} />}
          title="Prisma Intelligence & Diagnósticos"
        />
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
            {wallet.data?.balance ?? 0} Créditos IA
          </span>
          <span className="rounded-full bg-[#B9FF66] border border-black/5 px-3.5 py-1.5 text-xs font-bold text-[#191A23] shadow-xs">
            {plan?.name ?? "Plano Pro Scale"}
          </span>
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <BrainCircuit size={16} /> Saúde da Operação
            </span>
            <span className="text-xs font-medium text-slate-400">Últimos 30 dias</span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[120px_1fr] items-center">
            <div className="rounded-xl border border-black/5 bg-[#B9FF66] p-4 text-center shadow-xs">
              <strong className="text-4xl font-bold text-[#191A23] leading-none">{score}</strong>
              <span className="mt-1 block text-[10px] font-bold uppercase text-[#191A23]/70">de 100 pontos</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#191A23] tracking-tight leading-snug">
                {score >= 70 ? "Operação pronta para escalar tráfego pago" : score >= 40 ? "Bom sinal. Há espaço para evoluir." : "Primeiro, construa uma base confiável."}
              </h2>
              <p className="mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">
                Leitura inteligente de play rate, retenção até o pitch delay e conversões confirmadas.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            <Mini label="Visualizações" value={totals.impressions} />
            <Mini label="Plays Únicos" value={totals.plays} />
            <Mini label="Conversões" value={totals.conversions} />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B9FF66] text-[#191A23] shadow-xs">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191A23]">Foco Recomendado</h2>
              <p className="text-xs font-medium text-slate-500">Onde agir para multiplicar vendas</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {actions.map((action) => (
              <Link
                href={action.href}
                key={action.title}
                className="group block rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:bg-slate-50/80 shadow-xs"
              >
                <div className="flex gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${action.tone === "amber" ? "bg-amber-400" : action.tone === "green" ? "bg-[#B9FF66]" : "bg-slate-900"}`} />
                  <div>
                    <h3 className="text-xs font-bold text-[#191A23]">{action.title}</h3>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">{action.detail}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#191A23] group-hover:underline">
                      Abrir análise <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section id="portfolio" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-[#191A23]">Radar do Portfólio de VSLs</h2>
            <p className="text-xs font-medium text-slate-500">Compare alcance, retenção e resultado entre suas páginas.</p>
          </div>
          <Link href="/dashboard/ab-tests" className="inline-flex items-center gap-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6ee50] border border-black/5 px-4 py-2 text-xs font-bold text-[#191A23] shadow-xs">
            <Zap size={14} /> Criar experimento A/B
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs font-medium text-[#191A23]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Posição / VSL</th>
                <th>Play rate</th>
                <th>Chegada ao pitch</th>
                <th>Retenção final</th>
                <th>Conversão</th>
                <th className="pr-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {performance.map((video, index) => (
                <tr key={video.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-[#B9FF66] text-[#191A23]" : "bg-slate-100 text-slate-700"}`}>
                        {index + 1}
                      </span>
                      <div>
                        <strong className="block max-w-[260px] truncate font-bold text-xs text-[#191A23]">{video.title}</strong>
                        <span className="text-[11px] text-slate-500">{video.impressions} visualizações</span>
                      </div>
                    </div>
                  </td>
                  <Metric value={video.playRate} />
                  <Metric value={video.pitch} />
                  <Metric value={video.completion} />
                  <Metric value={video.conversion} strong />
                  <td className="pr-6 text-right">
                    <Link href={`/dashboard/analytics/${video.id}`} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {!performance.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-medium text-slate-500">
                    Suas VSLs aparecerão aqui assim que forem publicadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <IntelligenceControls capabilities={capabilities} videoCount={performance.length} benchmarkData={benchmarkData} videos={performance.filter((video) => video.status === "ready").map(({ id, title }) => ({ id, title }))} />
    </main>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-3.5 text-center">
      <span className="block text-[10px] font-semibold uppercase text-slate-400">{label}</span>
      <strong className="mt-0.5 block text-xl font-bold text-[#191A23]">{value.toLocaleString("pt-BR")}</strong>
    </div>
  );
}

function Metric({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <td>
      <span className={strong ? "font-bold text-[#191A23]" : "font-medium text-slate-700"}>{value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
      <span className="ml-2 inline-block h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 align-middle">
        <span className="block h-full rounded-full bg-[#B9FF66]" style={{ width: `${Math.min(100, value)}%` }} />
      </span>
    </td>
  );
}
