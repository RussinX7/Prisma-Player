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
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import AudienceGlobe from "@/components/ui/cobe-audience-globe";

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
  liveCountries: Dimension[];
};

type AiResult = {
  headline: string;
  executiveSummary: string;
  opportunities: { priority: "high" | "medium" | "low"; title: string; evidence: string; action: string }[];
  experiments: { element: string; hypothesis: string; successMetric: string }[];
  warnings: string[];
};
type AiConversation = { id: string; title: string; question: string; result: AiResult; createdAt: string };

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

function formatTime(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "00:00";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function retentionPolyline(points: Point[], width = 1000, height = 360) {
  if (!points.length) return "";
  return points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - (Math.max(0, Math.min(100, point.rate)) / 100) * height;
    return `${x},${y}`;
  }).join(" ");
}

function retentionArea(points: Point[], width = 1000, height = 360) {
  const line = retentionPolyline(points, width, height);
  if (!line) return "";
  return `0,${height} ${line} ${width},${height}`;
}

function MiniSparkline({ values }: { values: number[] }) {
  const width = 220;
  const height = 54;
  const max = Math.max(...values, 1);
  const line = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - (value / max) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full overflow-visible">
      <polyline points={line} fill="none" stroke="#0066cc" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
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
  const [aiFullscreen, setAiFullscreen] = useState(false);
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false);
  const [aiConversations, setAiConversations] = useState<AiConversation[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(`prisma-ai-conversations:${videoId}`) ?? "[]") as AiConversation[];
        setAiConversations(Array.isArray(stored) ? stored.slice(0, 30) : []);
      } catch { setAiConversations([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [videoId]);

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
  const durationLabel = formatTime(data?.video.duration_seconds);
  const averageRetention = data?.retention.length ? data.retention.reduce((sum, point) => sum + point.rate, 0) / data.retention.length : 0;
  const firstDrop = data?.retention.find((point) => point.point > 0 && point.rate < 70);
  const pitchRetention = data?.summary.plays ? data.summary.reached75 / data.summary.plays * 100 : 0;
  const retentionSpark = data?.retention.map((point) => point.viewers) ?? [0];
  const activeCountryRows = data?.liveCountries ?? [];
  const maxCountryViews = Math.max(...activeCountryRows.map((row) => row.impressions), 1);

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
    const conversation: AiConversation = { id: crypto.randomUUID(), title: payload.result.headline || aiQuestion.slice(0, 54), question: aiQuestion.trim(), result: payload.result, createdAt: new Date().toISOString() };
    setAiConversations((current) => {
      const next = [conversation, ...current].slice(0, 30);
      localStorage.setItem(`prisma-ai-conversations:${videoId}`, JSON.stringify(next));
      return next;
    });
    setAiBalance(typeof payload.balance === "number" ? payload.balance : null);
  }

  return (
    <main className={`min-h-dvh bg-[#f5f5f7] text-[#1d1d1f] transition-[padding] duration-300 dark:bg-[#050507] dark:text-white ${aiOpen && !aiFullscreen ? "xl:pr-[480px]" : ""}`}>
      <header className="sticky top-0 z-30 border-b bg-white/92 px-3 py-2 backdrop-blur-xl themeable-border-hairline dark:bg-black/82 sm:px-5">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-[13px] themeable-text-ink-muted-48">
            <Link href="/dashboard/videos" className="inline-flex h-10 items-center gap-2 rounded-full px-2 font-medium text-prisma-blue transition hover:bg-prisma-blue/8">
              <ArrowLeft size={15} /> <span className="hidden xs:inline">Vídeos</span>
            </Link>
            <span aria-hidden="true" className="opacity-40">/</span>
            <span className="truncate font-semibold themeable-text-ink">Analytics</span>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none">
            <button onClick={() => setAiOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-medium themeable-text-ink transition hover:bg-prisma-blue/8">
              <Sparkles size={15} /> <span className="hidden sm:inline">Ask IA</span>
            </button>
            <Link href="/dashboard/settings" className="hidden h-10 items-center rounded-full px-3 text-[13px] font-medium themeable-text-ink transition hover:bg-black/5 md:inline-flex dark:hover:bg-white/5">Suporte</Link>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Período das métricas" className="h-10 max-w-[104px] rounded-full border bg-white px-3 text-[13px] outline-none themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]">
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
              <option value={365}>1 ano</option>
            </select>
            <button onClick={() => void load()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-white themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]" aria-label="Atualizar">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={exportCsv} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-3 text-[13px] font-medium themeable-border-hairline themeable-text-ink dark:bg-white/[0.04]" aria-label="Exportar métricas em CSV">
              <Download size={15} /> <span className="hidden lg:inline">Exportar CSV</span>
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
                      <div className="mt-6 rounded-[20px] bg-[#f5f5f7] p-4 dark:bg-white/[0.04]">
                        <svg viewBox="0 0 1000 260" preserveAspectRatio="none" className="h-[210px] w-full">
                          <defs>
                            <linearGradient id="quickRetentionArea" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#0066cc" stopOpacity="0.28" />
                              <stop offset="100%" stopColor="#0066cc" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2="1000" y1={line * 65} y2={line * 65} stroke="rgba(29,29,31,0.08)" />)}
                          <polygon points={retentionArea(data.retention, 1000, 260)} fill="url(#quickRetentionArea)" />
                          <polyline points={retentionPolyline(data.retention, 1000, 260)} fill="none" stroke="#0066cc" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                        </svg>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-[12px]">
                          <span className="themeable-text-ink-muted-48">Início <b className="themeable-text-ink">{format(data.retention[0]?.rate ?? 0, true)}</b></span>
                          <span className="themeable-text-ink-muted-48">Pitch <b className="themeable-text-ink">{format(pitchRetention, true)}</b></span>
                          <span className="themeable-text-ink-muted-48">Final <b className="themeable-text-ink">{format(data.summary.completionRate, true)}</b></span>
                        </div>
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
                <div className="space-y-5">
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-white/[0.03]">
                      <p className="text-[13px] themeable-text-ink-muted-48">Duração analisada</p>
                      <strong className="mt-2 block text-[28px] tracking-[-0.04em] themeable-text-ink">{durationLabel}</strong>
                      <p className="mt-2 text-[12px] themeable-text-ink-muted-48">Tempo real do vídeo enviado</p>
                    </article>
                    <article className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-white/[0.03]">
                      <p className="text-[13px] themeable-text-ink-muted-48">Retenção média</p>
                      <strong className="mt-2 block text-[28px] tracking-[-0.04em] themeable-text-ink">{format(averageRetention, true)}</strong>
                      <MiniSparkline values={retentionSpark} />
                    </article>
                    <article className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-white/[0.03]">
                      <p className="text-[13px] themeable-text-ink-muted-48">Primeira queda forte</p>
                      <strong className="mt-2 block text-[28px] tracking-[-0.04em] themeable-text-ink">{firstDrop ? `${firstDrop.point}%` : "OK"}</strong>
                      <p className="mt-2 text-[12px] themeable-text-ink-muted-48">{firstDrop ? `Retenção caiu para ${format(firstDrop.rate, true)}` : "Sem queda abaixo de 70%"}</p>
                    </article>
                    <article className="rounded-[20px] border bg-white p-4 themeable-border-hairline dark:bg-white/[0.03]">
                      <p className="text-[13px] themeable-text-ink-muted-48">Retenção no pitch</p>
                      <strong className="mt-2 block text-[28px] tracking-[-0.04em] themeable-text-ink">{format(pitchRetention, true)}</strong>
                      <p className="mt-2 text-[12px] themeable-text-ink-muted-48">Pessoas que chegaram em 75% da VSL</p>
                    </article>
                  </section>

                  <section className="overflow-hidden rounded-[24px] border bg-white themeable-border-hairline dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 themeable-border-hairline">
                      <div>
                        <h2 className="text-[20px] font-semibold tracking-[-0.03em] themeable-text-ink">Curva de retenção do vídeo</h2>
                        <p className="mt-1 text-[13px] themeable-text-ink-muted-48">Visualize exatamente onde a atenção cai e onde a VSL segura o lead.</p>
                      </div>
                      <span className="rounded-full bg-prisma-blue/10 px-3 py-1 text-[12px] font-semibold text-prisma-blue">{data.retention.length} marcos reais</span>
                    </div>
                    <div className="relative min-h-[360px] bg-black">
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[length:10%_100%,100%_10%]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,102,204,0.34),transparent_24%),linear-gradient(90deg,rgba(0,0,0,0.88),rgba(0,0,0,0.24),rgba(0,0,0,0.88))]" />
                      <div className="absolute left-3 top-4 flex h-[calc(100%-54px)] flex-col justify-between text-[11px] text-white/75">
                        {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((item) => <span key={item}>{item}%</span>)}
                      </div>
                      <svg viewBox="0 0 1000 360" preserveAspectRatio="none" className="absolute inset-x-10 bottom-10 top-6 h-[calc(100%-70px)] w-[calc(100%-72px)] overflow-visible">
                        <defs>
                          <linearGradient id="retentionAreaGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.62" />
                            <stop offset="100%" stopColor="#0066cc" stopOpacity="0.18" />
                          </linearGradient>
                        </defs>
                        <polygon points={retentionArea(data.retention)} fill="url(#retentionAreaGradient)" />
                        <polyline points={retentionPolyline(data.retention)} fill="none" stroke="#22d3ee" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                        <polyline points={retentionPolyline(data.retention.map((point, index) => ({ ...point, rate: Math.max(0, point.rate - 8 - index * 0.6) })))} fill="none" stroke="#16a34a" strokeWidth="2.4" opacity="0.85" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <div className="absolute inset-x-10 bottom-3 flex justify-between text-[11px] text-white/75">
                        <span>00:00</span>
                        <span>{formatTime((data.video.duration_seconds ?? 0) * 0.25)}</span>
                        <span>{formatTime((data.video.duration_seconds ?? 0) * 0.5)}</span>
                        <span>{formatTime((data.video.duration_seconds ?? 0) * 0.75)}</span>
                        <span>{durationLabel}</span>
                      </div>
                    </div>
                  </section>
                </div>
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
                <section className="overflow-hidden rounded-[24px] border bg-white themeable-border-hairline dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 themeable-border-hairline">
                    <div>
                      <h2 className="text-[20px] font-semibold tracking-[-0.03em] themeable-text-ink">Ao vivo agora</h2>
                      <p className="text-[13px] themeable-text-ink-muted-48">Países conectados assistindo sua VSL em tempo real.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[13px] font-semibold text-red-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      {data.live} assistindo
                    </div>
                  </div>
                  <div className="grid min-h-[520px] lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="relative grid min-h-[420px] place-items-center border-b bg-[radial-gradient(circle_at_center,#ffffff_0%,#f8fbff_42%,#edf4ff_100%)] themeable-border-hairline dark:bg-[radial-gradient(circle_at_center,#182033_0%,#080b12_70%)] lg:border-b-0 lg:border-r">
                      <AudienceGlobe countries={activeCountryRows} live={data.live} />
                    </div>
                    <div className="max-h-[520px] overflow-y-auto p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold themeable-text-ink">Países ativos</h3>
                        <span className="text-[12px] themeable-text-ink-muted-48">últimos minutos</span>
                      </div>
                      <div className="space-y-4">
                        {(activeCountryRows.length ? activeCountryRows : [{ name: "Nenhum país conectado agora", impressions: 0, plays: 0, playRate: 0, completes: 0, completionRate: 0 }]).map((row) => (
                          <div key={row.name} className="grid grid-cols-[1fr_96px_64px] items-center gap-3 text-[14px]">
                            <span className="truncate themeable-text-ink">{row.name}</span>
                            <span className="h-2 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-white/10">
                              <span className="block h-full rounded-full bg-prisma-blue" style={{ width: `${Math.max(row.impressions ? 4 : 0, row.impressions / maxCountryViews * 100)}%` }} />
                            </span>
                            <strong className="text-right themeable-text-ink">{format(row.impressions)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={`fixed inset-0 z-40 bg-black/18 transition-opacity ${aiOpen ? "pointer-events-auto opacity-100 xl:pointer-events-none xl:opacity-0" : "pointer-events-none opacity-0"}`} onClick={() => setAiOpen(false)} />
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l bg-white shadow-2xl transition-[transform,max-width] duration-300 themeable-border-hairline dark:bg-[#070709] ${aiFullscreen ? "max-w-none" : "max-w-[480px]"} ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex min-h-16 items-center justify-between border-b px-5 themeable-border-hairline">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-prisma-blue">Prisma IA</p>
            <h2 className="text-[17px] font-semibold themeable-text-ink">Nova conversa</h2>
          </div>
          <div className="relative flex items-center gap-1"><button onClick={() => setAiHistoryOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]" aria-label="Histórico de conversas"><History size={18} /></button><button onClick={() => setAiFullscreen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]" aria-label={aiFullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"}>{aiFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><button onClick={() => setAiOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]" aria-label="Fechar Ask IA"><X size={18} /></button>{aiHistoryOpen && <div className="absolute right-0 top-12 z-20 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[18px] border bg-white p-2 shadow-2xl themeable-border-hairline dark:bg-[#151518]"><div className="flex items-center justify-between px-3 py-2"><strong className="text-[13px] themeable-text-ink">Histórico</strong><span className="text-[11px] themeable-text-ink-muted-48">{aiConversations.length} conversas</span></div><div className="max-h-[55dvh] space-y-1 overflow-y-auto">{aiConversations.length === 0 ? <p className="px-3 py-6 text-center text-[12px] themeable-text-ink-muted-48">Suas análises aparecerão aqui.</p> : aiConversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => { setAiQuestion(conversation.question); setAiResult(conversation.result); setAiHistoryOpen(false); }} className="block w-full rounded-[12px] px-3 py-2 text-left hover:bg-[#f5f5f7] dark:hover:bg-white/[0.06]"><span className="block truncate text-[12px] font-semibold themeable-text-ink">{conversation.title}</span><span className="mt-1 block truncate text-[11px] themeable-text-ink-muted-48">{conversation.question}</span></button>)}</div></div>}</div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f7f8fa] px-4 py-8 dark:bg-[#0b0b0d] sm:px-6">
          <div className="mx-auto w-full max-w-3xl rounded-[24px] border bg-white p-5 themeable-border-hairline dark:bg-[#101014]">
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

          {aiError && <p className="mx-auto mt-4 max-w-3xl rounded-[18px] bg-red-500/10 p-3 text-[13px] text-red-600">{aiError}</p>}

          {aiLoading && (
            <div className="mx-auto mt-4 max-w-3xl rounded-[24px] border bg-white p-4 themeable-border-hairline dark:bg-[#101014]">
              <RefreshCw size={18} className="animate-spin text-prisma-blue" />
              <p className="mt-3 text-[14px] themeable-text-ink">Analisando retenção, funil e sinais de campanha...</p>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="mx-auto mt-4 max-w-3xl space-y-3">
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

        <div className="border-t bg-white px-4 py-4 themeable-border-hairline dark:bg-[#070709] sm:px-6">
          <div className="mx-auto w-full max-w-3xl rounded-[22px] border bg-white p-3 shadow-[0_8px_30px_rgba(0,46,110,.09)] transition-shadow focus-within:shadow-[0_12px_38px_rgba(0,102,204,.15)] themeable-border-hairline dark:bg-[#202024]">
            <textarea
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value.slice(0, 500))}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!aiLoading && aiQuestion.trim()) void askAi(); } }}
              placeholder="Pergunte à Prisma IA sobre retenção, CTA, headline ou tráfego..."
              rows={2}
              className="max-h-40 min-h-14 w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-relaxed outline-none themeable-text-ink placeholder:themeable-text-ink-muted-48"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 rounded-[10px] bg-prisma-blue/8 px-3 text-[12px] font-semibold text-prisma-blue"><Sparkles size={14} /> Especialista em VSL</span>
              <span className="ml-auto text-[11px] themeable-text-ink-muted-48">{aiBalance !== null ? `${aiBalance} créditos` : `${500 - aiQuestion.length} caracteres`}</span>
              <button type="button" onClick={() => void askAi()} disabled={aiLoading || !aiQuestion.trim()} aria-label="Enviar pergunta" className="grid h-9 w-9 place-items-center rounded-[12px] bg-prisma-blue text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">
                {aiLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] themeable-text-ink-muted-48">A Prisma IA usa apenas as métricas autorizadas desta VSL. Confirme decisões importantes antes de publicar.</p>
        </div>
      </aside>
    </main>
  );
}
