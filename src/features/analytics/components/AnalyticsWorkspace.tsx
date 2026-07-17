"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Download,
  Funnel,
  Globe2,
  Lightbulb,
  MessageCircle,
  MonitorSmartphone,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type Summary = {
  impressions: number;
  plays: number;
  playRate: number;
  reached25: number;
  reached50: number;
  reached75: number;
  reached90: number;
  completed: number;
  completionRate: number;
  ctaClicks: number;
  conversions: number;
};

type Point = { point: number; viewers: number; rate: number };
type Dimension = { name: string; impressions: number; plays: number; playRate: number; completes: number; completionRate: number };
type Data = {
  video: { title: string; duration_seconds: number | null };
  summary: Summary;
  retention: Point[];
  funnel: { name: string; value: number }[];
  dimensions: Record<string, Dimension[]>;
  insights: { tone: string; title: string; detail: string }[];
  live: number;
};

type AiResult = {
  headline: string;
  executiveSummary: string;
  opportunities: { priority: "high" | "medium" | "low"; title: string; evidence: string; action: string }[];
  experiments: { element: string; hypothesis: string; successMetric: string }[];
  warnings: string[];
};

const tabs = [
  { id: "overview", label: "Visão geral", icon: BarChart3 },
  { id: "retention", label: "Retenção", icon: Activity },
  { id: "funnel", label: "Funil", icon: Funnel },
  { id: "audience", label: "Público", icon: Globe2 },
  { id: "technology", label: "Tecnologia", icon: MonitorSmartphone },
  { id: "traffic", label: "Origem", icon: Users },
  { id: "live", label: "Ao vivo", icon: Radio },
];

const suggestionPrompts = [
  "O que eu deveria melhorar primeiro nessa VSL?",
  "Onde eu deveria posicionar o CTA para aumentar conversão?",
  "Qual teste A/B vale mais a pena rodar agora?",
  "Por que a retenção pode estar caindo?",
];

function format(value: number, percent = false) {
  return percent ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : value.toLocaleString("pt-BR");
}

function DimensionTable({ title, rows }: { title: string; rows: Dimension[] }) {
  return (
    <section className="rounded-[22px] border bg-white p-4 sm:p-5 themeable-border-hairline dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] themeable-text-ink">{title}</h3>
        <span className="rounded-full bg-prisma-blue/10 px-3 py-1 text-[12px] font-semibold text-prisma-blue">{rows.length} segmentos</span>
      </div>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead className="themeable-text-ink-muted-48">
              <tr className="border-b themeable-border-hairline">
                <th className="pb-3 font-medium">Segmento</th>
                <th className="pb-3 font-medium">Visualizações</th>
                <th className="pb-3 font-medium">Plays</th>
                <th className="pb-3 font-medium">Play rate</th>
                <th className="pb-3 font-medium">Conclusões</th>
                <th className="pb-3 font-medium">Retenção final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b last:border-0 themeable-border-hairline">
                  <td className="py-3 font-semibold themeable-text-ink">{row.name}</td>
                  <td>{format(row.impressions)}</td>
                  <td>{format(row.plays)}</td>
                  <td>{format(row.playRate, true)}</td>
                  <td>{format(row.completes)}</td>
                  <td>{format(row.completionRate, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 rounded-[18px] border border-dashed p-8 text-center text-[14px] themeable-border-hairline themeable-text-ink-muted-48">
          Os segmentos aparecerão quando o embed receber acessos reais.
        </p>
      )}
    </section>
  );
}

function MetricCard({ label, value, hint, featured }: { label: string; value: string; hint: string; featured?: boolean }) {
  return (
    <article className={`rounded-[22px] border p-5 themeable-border-hairline ${featured ? "bg-prisma-blue text-white" : "bg-white themeable-text-ink dark:bg-white/[0.03]"}`}>
      <p className={`text-[13px] ${featured ? "text-white/72" : "themeable-text-ink-muted-48"}`}>{label}</p>
      <strong className="mt-3 block text-[32px] font-semibold tracking-[-0.05em] sm:text-[36px]">{value}</strong>
      <p className={`mt-2 text-[12px] ${featured ? "text-white/72" : "themeable-text-ink-muted-48"}`}>{hint}</p>
    </article>
  );
}

export default function AnalyticsWorkspace({ videoId }: { videoId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState("overview");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("O que eu deveria melhorar primeiro nessa VSL?");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiBalance, setAiBalance] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/analytics/${videoId}?days=${days}`, { cache: "no-store" });
    if (response.ok) setData(await response.json());
    setLoading(false);
  }, [days, videoId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const maxFunnel = data?.funnel[0]?.value || 1;

  const cards = useMemo(() => data ? [
    { label: "Visualizações", value: format(data.summary.impressions), hint: "Sessões que viram o player", featured: true },
    { label: "Plays", value: format(data.summary.plays), hint: "Pessoas que iniciaram" },
    { label: "Play rate", value: format(data.summary.playRate, true), hint: "Plays ÷ visualizações" },
    { label: "Chegaram à oferta", value: format(data.summary.reached75), hint: "Assistiram pelo menos 75%" },
    { label: "Conclusões", value: format(data.summary.completed), hint: "Chegaram ao fim" },
    { label: "Retenção final", value: format(data.summary.completionRate, true), hint: "Conclusões ÷ plays" },
  ] : [], [data]);

  function exportCsv() {
    if (!data) return;
    const rows = [["Métrica", "Valor"], ...Object.entries(data.summary).map(([key, value]) => [key, String(value)])];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `prisma-analytics-${videoId}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function askAi() {
    if (aiLoading || !aiQuestion.trim()) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiError("");
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId, days, type: "performance", question: aiQuestion }),
    });
    const payload = await response.json().catch(() => null) as { result?: AiResult; balance?: number; error?: string } | null;
    setAiLoading(false);
    if (!response.ok || !payload?.result) {
      const messageByCode: Record<string, string> = {
        insufficient_credits: "Você não tem créditos de Prisma IA suficientes.",
        analysis_in_progress: "Já existe uma análise em andamento para sua conta. Tente de novo em instantes.",
        ai_rate_limit_10m: "Limite de uso atingido. Espere alguns minutos antes de perguntar de novo.",
        ai_rate_limit_daily: "Limite diário de IA atingido. Volte amanhã ou aumente seus créditos.",
        nvidia_not_configured: "A chave NVIDIA_API_KEY ainda não foi configurada na Vercel.",
      };
      setAiError(messageByCode[payload?.error ?? ""] ?? "Não foi possível consultar a Prisma IA agora.");
      return;
    }
    setAiResult(payload.result);
    setAiBalance(typeof payload.balance === "number" ? payload.balance : null);
  }

  return (
    <main className="min-h-dvh bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050507] dark:text-white">
      <header className="sticky top-0 z-30 border-b bg-white/86 px-4 py-4 backdrop-blur-xl themeable-border-hairline dark:bg-black/70 sm:px-7">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link href="/dashboard/videos" className="inline-flex items-center gap-2 text-[13px] font-medium text-prisma-blue">
              <ArrowLeft size={15} /> Voltar aos vídeos
            </Link>
            <h1 className="mt-2 truncate text-[24px] font-semibold tracking-[-0.04em] themeable-text-ink">{data?.video.title ?? "Analytics da VSL"}</h1>
            <p className="mt-1 max-w-2xl text-[13px] themeable-text-ink-muted-48">Métricas reais do embed, retenção, funil e inteligência para otimizar sua VSL.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setAiOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 text-[13px] font-medium text-white dark:bg-white dark:text-black">
              <Sparkles size={15} /> Ask IA
            </button>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-11 rounded-full border bg-white px-4 text-[13px] outline-none themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]">
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
              <option value={365}>1 ano</option>
            </select>
            <button onClick={() => void load()} className="grid h-11 w-11 place-items-center rounded-full border bg-white themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]" aria-label="Atualizar">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-full border bg-white px-4 text-[13px] font-medium themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]">
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-4 py-5 lg:px-7">
        <nav className="mb-5 flex gap-2 overflow-x-auto rounded-[18px] border bg-white p-2 themeable-border-hairline dark:bg-white/[0.03]">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-[13px] px-4 text-left text-[13px] font-medium transition ${tab === item.id ? "bg-prisma-blue text-white" : "themeable-text-ink hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]"}`}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          {loading && !data ? (
            <div className="grid min-h-[520px] place-items-center rounded-[24px] border bg-white themeable-border-hairline dark:bg-white/[0.03]">
              <RefreshCw className="animate-spin text-prisma-blue" />
            </div>
          ) : !data ? (
            <div className="rounded-[24px] border bg-white p-10 text-center themeable-border-hairline themeable-text-ink dark:bg-white/[0.03]">
              Não foi possível carregar os dados. Confira se a migration de Analytics foi aplicada.
            </div>
          ) : (
            <div className="space-y-5">
              {tab === "overview" && (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => <MetricCard key={card.label} {...card} />)}
                  </section>

                  <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
                    <div className="rounded-[24px] border bg-white p-5 themeable-border-hairline dark:bg-white/[0.03]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-[19px] font-semibold tracking-[-0.03em] themeable-text-ink">Curva rápida de retenção</h2>
                          <p className="text-[13px] themeable-text-ink-muted-48">Onde a atenção está segurando ou escapando.</p>
                        </div>
                        <TrendingUp className="text-prisma-blue" size={22} />
                      </div>
                      <div className="mt-7 flex h-[210px] items-end gap-2 rounded-[20px] bg-[#f5f5f7] p-4 dark:bg-white/[0.04]">
                        {data.retention.map((point) => (
                          <div key={point.point} className="flex h-full flex-1 flex-col justify-end gap-2">
                            <span className="text-center text-[11px] font-semibold themeable-text-ink">{format(point.rate, true)}</span>
                            <div className="min-h-2 rounded-t-full bg-prisma-blue" style={{ height: `${Math.max(2, point.rate)}%` }} />
                            <span className="text-center text-[11px] themeable-text-ink-muted-48">{point.point}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border bg-white p-5 themeable-border-hairline dark:bg-white/[0.03]">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={18} className="text-amber-500" />
                        <h2 className="font-semibold themeable-text-ink">Diagnóstico inteligente</h2>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {data.insights.map((insight) => (
                          <article key={insight.title} className="rounded-[18px] bg-[#f5f5f7] p-4 dark:bg-white/[0.04]">
                            <strong className="themeable-text-ink">{insight.title}</strong>
                            <p className="mt-1 text-[13px] leading-relaxed themeable-text-ink-muted-48">{insight.detail}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {tab === "retention" && (
                <section className="rounded-[24px] border bg-white p-5 sm:p-6 themeable-border-hairline dark:bg-white/[0.03]">
                  <h2 className="text-[20px] font-semibold tracking-[-0.03em] themeable-text-ink">Curva de retenção</h2>
                  <p className="mt-1 text-[13px] themeable-text-ink-muted-48">Mostra quantas pessoas permanecem em cada trecho. Os dados são marcos reais enviados pelo player.</p>
                  <div className="mt-7 flex h-[300px] items-end gap-2 rounded-[22px] bg-[#f5f5f7] p-4 dark:bg-white/[0.04] sm:h-[380px] sm:p-5">
                    {data.retention.map((point) => (
                      <div key={point.point} className="flex h-full flex-1 flex-col justify-end gap-2">
                        <span className="text-center text-[11px] font-semibold themeable-text-ink">{format(point.rate, true)}</span>
                        <div className="min-h-1 rounded-t-[16px] bg-prisma-blue" style={{ height: `${Math.max(2, point.rate)}%` }} />
                        <span className="pb-1 text-center text-[11px] themeable-text-ink-muted-48">{point.point}%</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {tab === "funnel" && (
                <section className="rounded-[24px] border bg-white p-5 sm:p-6 themeable-border-hairline dark:bg-white/[0.03]">
                  <h2 className="text-[20px] font-semibold tracking-[-0.03em] themeable-text-ink">Funil da VSL</h2>
                  <div className="mt-6 space-y-4">
                    {data.funnel.map((step, index) => (
                      <div key={step.name} className="grid gap-2 text-[13px] sm:grid-cols-[138px_1fr_82px] sm:items-center sm:gap-3">
                        <span className="themeable-text-ink">{step.name}</span>
                        <div className="h-11 overflow-hidden rounded-[12px] bg-[#f5f5f7] dark:bg-white/[0.04]">
                          <div className="h-full rounded-[12px] bg-prisma-blue transition-all" style={{ width: `${Math.max(step.value ? 5 : 0, step.value / maxFunnel * 100)}%`, opacity: 1 - index * 0.08 }} />
                        </div>
                        <strong className="text-left themeable-text-ink sm:text-right">{format(step.value)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {tab === "audience" && <div className="grid gap-5"><DimensionTable title="Países" rows={data.dimensions.countries} /><DimensionTable title="Dispositivos" rows={data.dimensions.devices} /></div>}
              {tab === "technology" && <div className="grid gap-5"><DimensionTable title="Sistemas operacionais" rows={data.dimensions.operatingSystems} /><DimensionTable title="Navegadores" rows={data.dimensions.browsers} /></div>}
              {tab === "traffic" && <DimensionTable title="Origem do tráfego" rows={data.dimensions.traffic} />}
              {tab === "live" && (
                <section className="grid min-h-[520px] place-items-center rounded-[24px] border bg-white p-8 text-center themeable-border-hairline dark:bg-white/[0.03]">
                  <div>
                    <span className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-prisma-blue/10">
                      <Radio size={42} className="text-prisma-blue" />
                      <i className="absolute right-3 top-3 h-4 w-4 animate-pulse rounded-full bg-red-500" />
                    </span>
                    <strong className="mt-6 block text-[64px] font-semibold tracking-[-0.06em] themeable-text-ink">{data.live}</strong>
                    <p className="themeable-text-ink-muted-48">espectador{data.live === 1 ? "" : "es"} ativo{data.live === 1 ? "" : "s"} nos últimos 2 minutos</p>
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={`fixed inset-0 z-40 bg-black/18 transition-opacity lg:bg-transparent ${aiOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setAiOpen(false)} />
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[440px] flex-col border-l bg-white shadow-2xl transition-transform duration-300 themeable-border-hairline dark:bg-[#070709] ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex min-h-16 items-center justify-between border-b px-5 themeable-border-hairline">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-prisma-blue">Prisma IA</p>
            <h2 className="text-[17px] font-semibold themeable-text-ink">Nova conversa</h2>
          </div>
          <button onClick={() => setAiOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]" aria-label="Fechar Ask IA">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle,#d8dee8_1px,transparent_1px)] p-5 [background-size:18px_18px] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)]">
          <div className="rounded-[24px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-prisma-blue text-white"><Sparkles size={19} /></span>
              <div>
                <h3 className="font-semibold themeable-text-ink">Como posso ajudar sua VSL?</h3>
                <p className="text-[13px] themeable-text-ink-muted-48">Eu leio as métricas reais e sugiro próximos passos.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {suggestionPrompts.map((prompt) => (
                <button key={prompt} onClick={() => setAiQuestion(prompt)} className="rounded-[16px] border bg-[#fafafc] px-3 py-2 text-left text-[13px] themeable-border-hairline themeable-text-ink hover:border-prisma-blue dark:bg-white/[0.04]">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {aiError && <p className="mt-4 rounded-[18px] bg-red-500/10 p-3 text-[13px] text-red-600">{aiError}</p>}

          {aiLoading && (
            <div className="mt-4 rounded-[24px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
              <RefreshCw size={18} className="animate-spin text-prisma-blue" />
              <p className="mt-3 text-[14px] themeable-text-ink">Analisando retenção, funil e sinais de campanha...</p>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="mt-4 space-y-3">
              <article className="rounded-[24px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-prisma-blue">{aiResult.headline}</p>
                <p className="mt-2 text-[14px] leading-relaxed themeable-text-ink">{aiResult.executiveSummary}</p>
              </article>
              {aiResult.opportunities.map((item) => (
                <article key={`${item.priority}-${item.title}`} className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
                  <span className="rounded-full bg-prisma-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-prisma-blue">{item.priority}</span>
                  <h4 className="mt-3 font-semibold themeable-text-ink">{item.title}</h4>
                  <p className="mt-1 text-[13px] themeable-text-ink-muted-48">{item.evidence}</p>
                  <p className="mt-3 text-[13px] font-medium themeable-text-ink">{item.action}</p>
                </article>
              ))}
              {aiResult.experiments.length > 0 && (
                <article className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
                  <h4 className="font-semibold themeable-text-ink">Testes sugeridos</h4>
                  <div className="mt-3 space-y-3">
                    {aiResult.experiments.map((experiment) => (
                      <div key={`${experiment.element}-${experiment.hypothesis}`} className="rounded-[16px] bg-[#f5f5f7] p-3 dark:bg-white/[0.04]">
                        <p className="text-[13px] font-semibold themeable-text-ink">{experiment.element}</p>
                        <p className="mt-1 text-[12px] themeable-text-ink-muted-48">{experiment.hypothesis}</p>
                        <p className="mt-2 text-[12px] text-prisma-blue">{experiment.successMetric}</p>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-white p-4 themeable-border-hairline dark:bg-[#070709]">
          <textarea
            value={aiQuestion}
            onChange={(event) => setAiQuestion(event.target.value.slice(0, 500))}
            placeholder="Pergunte sobre retenção, CTA, headline, tráfego..."
            className="min-h-24 w-full resize-none rounded-[20px] border bg-white p-3 text-[14px] outline-none focus:border-prisma-blue themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] themeable-text-ink-muted-48">
              {aiBalance !== null ? `${aiBalance} créditos` : `${500 - aiQuestion.length} caracteres`}
            </p>
            <button type="button" onClick={() => void askAi()} disabled={aiLoading || !aiQuestion.trim()} className="inline-flex h-11 items-center gap-2 rounded-full bg-prisma-blue px-5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {aiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} Ask
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
