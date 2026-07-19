"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Download,
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
import ClaudeChatInput from "@/components/ui/claude-style-chat-input";

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
type TimelinePoint = { date: string; label: string; impressions: number; plays: number; completes: number; conversions: number };
type Data = {
  video: { title: string; duration_seconds: number | null; source: string | null; type: string | null };
  summary: Summary;
  comparison: { previous: Summary; delta: { impressions: number; plays: number; playRate: number; completionRate: number; conversions: number } };
  timeline: TimelinePoint[];
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
  { id: "funnel", label: "Funil", icon: TrendingUp },
  { id: "audience", label: "Público", icon: Users },
  { id: "technology", label: "Tecnologia", icon: MonitorSmartphone },
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

function MiniSparkline({ values, color = "#0066cc" }: { values: number[]; color?: string }) {
  const width = 220;
  const height = 50;
  const max = Math.max(...values, 1);
  const line = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - (value / max) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full overflow-visible opacity-90 transition-opacity">
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TimelineChart({ points }: { points: TimelinePoint[] }) {
  const width = 1200;
  const height = 300;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maximum = Math.max(...points.flatMap((point) => [point.impressions, point.plays]), 1);

  const getX = (index: number) => {
    if (points.length === 1) return width / 2;
    return (index / (points.length - 1)) * width;
  };

  const getY = (value: number) => {
    return height - (value / maximum) * (height - 40) - 20;
  };

  const line = (key: "impressions" | "plays") => points.map((point, index) => {
    return `${getX(index)},${getY(point[key])}`;
  }).join(" ");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const svgX = (clientX / rect.width) * width;

    let closestIndex = 0;
    let minDiff = Infinity;
    points.forEach((_, index) => {
      const diff = Math.abs(getX(index) - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    setHoverIndex(closestIndex);
    const pointClientX = (getX(closestIndex) / width) * rect.width;
    setTooltipPos({ x: pointClientX, y: clientY });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="mt-5 font-sans">
      <div className="mb-4 flex flex-wrap items-center gap-5 text-[12px] font-semibold text-[#7a7a7a] dark:text-[#cccccc]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0066cc] dark:bg-[#2997ff]" /> 
          Visualizações
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22d3ee] dark:bg-[#22d3ee]" /> 
          Plays
        </span>
      </div>
      
      <div 
        className="relative h-[280px] overflow-hidden rounded-[11px] bg-[#ffffff] p-4 border border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] cursor-crosshair transition-colors"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {[0, 1, 2, 3, 4].map((grid) => (
            <line 
              key={grid} 
              x1="0" 
              x2={width} 
              y1={(grid * height) / 4} 
              y2={(grid * height) / 4} 
              stroke="currentColor" 
              className="text-black/[0.04] dark:text-white/[0.05]" 
              strokeDasharray="4 6" 
            />
          ))}
          
          <polyline points={line("impressions")} fill="none" stroke="#0066cc" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="dark:stroke-[#2997ff]" />
          <polyline points={line("plays")} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />

          {/* Interactive Guides & Dots */}
          {hoverIndex !== null && points[hoverIndex] && (
            <>
              <line 
                x1={getX(hoverIndex)} 
                y1={0} 
                x2={getX(hoverIndex)} 
                y2={height} 
                stroke="currentColor" 
                className="text-black/10 dark:text-white/10" 
                strokeWidth={1} 
              />
              <circle 
                cx={getX(hoverIndex)} 
                cy={getY(points[hoverIndex].impressions)} 
                r={5} 
                fill="#0066cc" 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                className="dark:fill-[#2997ff]"
              />
              <circle 
                cx={getX(hoverIndex)} 
                cy={getY(points[hoverIndex].plays)} 
                r={5} 
                fill="#22d3ee" 
                stroke="#ffffff" 
                strokeWidth={1.5} 
              />
            </>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div 
            className="absolute pointer-events-none z-20 rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-3 shadow-md dark:border-white/10 dark:bg-[#252527] text-[12px] min-w-[150px]"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${Math.max(10, tooltipPos.y - 15)}px`, 
              transform: 'translate(-50%, -100%)' 
            }}
          >
            <div className="font-semibold text-[#1d1d1f] dark:text-[#ffffff] border-b border-[#f0f0f0] dark:border-white/5 pb-1 mb-1.5">
              {points[hoverIndex].label}
            </div>
            <div className="flex items-center justify-between gap-4 text-[#7a7a7a] dark:text-[#cccccc]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0066cc] dark:bg-[#2997ff]" />
                Visualizações
              </span>
              <span className="font-semibold text-[#1d1d1f] dark:text-[#ffffff]">
                {format(points[hoverIndex].impressions)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[#7a7a7a] dark:text-[#cccccc] mt-1">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
                Plays
              </span>
              <span className="font-semibold text-[#1d1d1f] dark:text-[#ffffff]">
                {format(points[hoverIndex].plays)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex justify-between text-[11px] font-semibold text-[#7a7a7a] dark:text-[#cccccc] px-1">
        {points.filter((_, index) => index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)).map((point) => <span key={point.date}>{point.label}</span>)}
      </div>
    </div>
  );
}

function DimensionTable({ title, rows }: { title: string; rows: Dimension[] }) {
  const maxImpressions = useMemo(() => Math.max(...rows.map((r) => r.impressions), 1), [rows]);
  return (
    <section className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{title}</h3>
        <span className="rounded-full bg-[#0066cc]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#0066cc] dark:bg-[#2997ff]/10 dark:text-[#2997ff]">{rows.length} segmentos</span>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[14px]">
            <thead className="text-[#7a7a7a] dark:text-[#cccccc]">
              <tr className="border-b border-[#f0f0f0] dark:border-white/5">
                <th className="pb-3 font-medium">Segmento</th>
                <th className="pb-3 font-medium">Visualizações</th>
                <th className="pb-3 font-medium">Plays</th>
                <th className="pb-3 font-medium">Play rate</th>
                <th className="pb-3 font-medium">Conclusões</th>
                <th className="pb-3 font-medium">Retenção final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/5">
              {rows.map((row) => (
                <tr key={row.name} className="group hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors duration-150">
                  <td className="py-3.5 pr-4 font-semibold text-[#1d1d1f] dark:text-[#ffffff]">
                    <div className="flex flex-col gap-1.5">
                      <span className="truncate max-w-[180px]">{row.name}</span>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div 
                          className="h-full rounded-full bg-[#0066cc]/60 group-hover:bg-[#0066cc] dark:bg-[#2997ff]/60 dark:group-hover:bg-[#2997ff] transition-all duration-300"
                          style={{ width: `${(row.impressions / maxImpressions) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#1d1d1f] dark:text-[#ffffff]">{format(row.impressions)}</td>
                  <td className="py-3.5 text-[#1d1d1f] dark:text-[#ffffff]">{format(row.plays)}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center rounded-md bg-[#f5f5f7] dark:bg-white/5 px-2 py-0.5 font-semibold text-[12px] text-[#1d1d1f] dark:text-[#ffffff]">
                      {format(row.playRate, true)}
                    </span>
                  </td>
                  <td className="py-3.5 text-[#1d1d1f] dark:text-[#ffffff]">{format(row.completes)}</td>
                  <td className="py-3.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {format(row.completionRate, true)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-[11px] border border-dashed p-8 text-center text-[13px] border-[#e0e0e0] dark:border-white/5 text-[#7a7a7a]">
          Os segmentos aparecerão quando o embed receber acessos reais.
        </p>
      )}
    </section>
  );
}

function MetricCard({ label, value, hint, delta, values }: { label: string; value: string; hint: string; delta: number; values: number[] }) {
  const positive = delta >= 0;
  const themeColor = positive ? "#10b981" : "#ef4444";
  return (
    <article className="group min-w-0 overflow-hidden rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] transition-all duration-300 hover:border-[#0066cc]/40 dark:hover:border-[#2997ff]/40 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">{label}</p>
          <strong className="mt-1 block text-[32px] font-semibold tracking-[-0.03em] text-[#1d1d1f] dark:text-[#ffffff]">{value}</strong>
        </div>
        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
          {positive ? "↑" : "↓"} {format(Math.abs(delta), true)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">{hint}</p>
      <div className="mt-3">
        <MiniSparkline values={values.length ? values : [0]} color={themeColor} />
      </div>
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

  // Retention interactive states
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [videoRatio, setVideoRatio] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

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
    { label: "Visualizações", value: format(data.summary.impressions), hint: "Carregamentos reais do player", delta: data.comparison.delta.impressions, values: data.timeline.map((point) => point.impressions) },
    { label: "Plays", value: format(data.summary.plays), hint: "Sessões que iniciaram a VSL", delta: data.comparison.delta.plays, values: data.timeline.map((point) => point.plays) },
    { label: "Play rate", value: format(data.summary.playRate, true), hint: "Plays ÷ visualizações", delta: data.comparison.delta.playRate, values: data.timeline.map((point) => point.impressions ? point.plays / point.impressions * 100 : 0) },
    { label: "Retenção final", value: format(data.summary.completionRate, true), hint: "Conclusões ÷ plays", delta: data.comparison.delta.completionRate, values: data.timeline.map((point) => point.plays ? point.completes / point.plays * 100 : 0) },
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

  async function askAi(questionText?: string) {
    const q = questionText || aiQuestion;
    if (aiLoading || !q.trim()) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiError("");
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId, days, type: "performance", question: q }),
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
    const conversation: AiConversation = { id: crypto.randomUUID(), title: payload.result.headline || q.slice(0, 54), question: q.trim(), result: payload.result, createdAt: new Date().toISOString() };
    setAiConversations((current) => {
      const next = [conversation, ...current].slice(0, 30);
      localStorage.setItem(`prisma-ai-conversations:${videoId}`, JSON.stringify(next));
      return next;
    });
    setAiBalance(typeof payload.balance === "number" ? payload.balance : null);
  }

  return (
    <main className={`min-h-dvh bg-[#f5f5f7] text-[#1d1d1f] transition-[padding] duration-300 dark:bg-[#272729] dark:text-[#ffffff] ${aiOpen && !aiFullscreen ? "xl:pr-[480px]" : ""}`}>
      {/* Apple-styled Unified Header */}
      <header className="sticky top-0 z-30 border-b bg-[#ffffff]/80 px-4 py-3 backdrop-blur-md border-[#e0e0e0] dark:bg-[#252527]/80 dark:border-white/[0.04] sm:px-6">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-row items-center gap-3">
            <Link href="/dashboard/videos" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#0066cc] text-[#0066cc] bg-transparent hover:bg-[#0066cc]/5 px-4 text-[14px] font-semibold transition-all active:scale-[0.95] shrink-0 dark:border-[#2997ff] dark:text-[#2997ff] dark:hover:bg-[#2997ff]/5">
              <ArrowLeft size={14} />
              <span>Voltar</span>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#2997ff]">VSL Desempenho</span>
                <span className="h-1 w-1 rounded-full bg-black/20 dark:bg-white/20" />
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Tempo Real
                </span>
              </div>
              <h1 className="mt-0.5 truncate text-[24px] font-semibold tracking-[-0.025em] text-[#1d1d1f] dark:text-[#ffffff]">
                {data?.video.title ?? "VSL Analytics"}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <select 
              value={days} 
              onChange={(event) => setDays(Number(event.target.value))} 
              aria-label="Período das métricas" 
              className="h-9 rounded-[8px] border bg-[#ffffff] px-3 text-[14px] font-semibold outline-none transition-all hover:bg-[#f5f5f7] border-[#e0e0e0] text-[#1d1d1f] dark:bg-[#2a2a2c] dark:border-white/[0.08] dark:text-[#ffffff] dark:hover:bg-[#252527]"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Último ano</option>
            </select>

            <button 
              onClick={() => void load()} 
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border bg-[#ffffff] border-[#e0e0e0] text-[#1d1d1f] transition-all active:scale-[0.95] dark:bg-[#2a2a2c] dark:border-white/[0.08] dark:text-[#ffffff]" 
              aria-label="Atualizar"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            <button 
              onClick={exportCsv} 
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] border bg-[#ffffff] border-[#e0e0e0] px-3 text-[14px] font-semibold text-[#1d1d1f] transition-all active:scale-[0.95] dark:bg-[#2a2a2c] dark:border-white/[0.08] dark:text-[#ffffff]" 
              aria-label="Exportar métricas em CSV"
            >
              <Download size={14} />
              <span>Exportar</span>
            </button>

            <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

            <button 
              onClick={() => setAiOpen(true)} 
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0066cc] px-4 text-[14px] font-semibold text-[#ffffff] shadow-none transition-all hover:bg-[#0071e3] active:scale-[0.95]"
            >
              <Sparkles size={13} /> 
              <span>Ask IA</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-4 py-6 lg:px-7">
        
        {/* Apple Segmented Control Navigation */}
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-[#e0e0e0] bg-[#f5f5f7]/80 p-1 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#252527]/80 max-w-fit">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12px] font-bold tracking-tight transition-all duration-200 ${
                  active 
                    ? "bg-[#0066cc] text-[#ffffff] shadow-none dark:bg-[#2997ff]/10 dark:text-[#2997ff] dark:border dark:border-[#2997ff]/20" 
                    : "text-[#7a7a7a] hover:bg-black/[0.02] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                <Icon size={14} className={active ? "text-white dark:text-[#2997ff]" : "text-[#7a7a7a] dark:text-[#cccccc]"} /> 
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          {loading && !data ? (
            <div className="grid min-h-[500px] place-items-center rounded-[18px] border border-[#e0e0e0] bg-[#ffffff] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
              <RefreshCw className="animate-spin text-[#0066cc] dark:text-[#2997ff]" />
            </div>
          ) : !data ? (
            <div className="rounded-[18px] border border-[#e0e0e0] bg-[#ffffff] p-10 text-center text-[#7a7a7a] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
              Não foi possível carregar os dados. Confira se a migration de Analytics foi aplicada.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* TAB 1: VISÃO GERAL */}
              {tab === "overview" && (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => <MetricCard key={card.label} {...card} />)}
                  </section>

                  <section className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] sm:p-6 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Tráfego e reprodução</h2>
                        <p className="mt-1 text-[13px] text-[#7a7a7a] dark:text-[#cccccc]">Visualizações e sessões que realmente iniciaram o vídeo.</p>
                      </div>
                      <div className="flex gap-6 text-right text-[12px]">
                        <span>
                          <b className="block text-[18px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">{format(data.summary.reached75)}</b>
                          <i className="not-italic text-[#7a7a7a] dark:text-[#cccccc] font-medium">chegaram à oferta</i>
                        </span>
                        <span>
                          <b className="block text-[18px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">{format(data.summary.conversions)}</b>
                          <i className="not-italic text-[#7a7a7a] dark:text-[#cccccc] font-medium">conversões</i>
                        </span>
                      </div>
                    </div>
                    <TimelineChart points={data.timeline} />
                  </section>

                  <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <div className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Retenção por marco</h2>
                          <p className="text-[13px] text-[#7a7a7a] dark:text-[#cccccc]">Atenção preservada ao longo da VSL.</p>
                        </div>
                        <TrendingUp className="text-[#0066cc] dark:text-[#2997ff]" size={20} />
                      </div>
                      <div className="rounded-[11px] bg-[#f5f5f7] p-4 dark:bg-[#252527] border border-[#e0e0e0] dark:border-white/5">
                        <svg viewBox="0 0 1000 180" preserveAspectRatio="none" className="h-[140px] w-full overflow-visible">
                          {[0, 25, 50, 75, 100].map((pct) => (
                            <line key={pct} x1="0" x2="1000" y1={180 - (pct / 100) * 150 - 15} y2={180 - (pct / 100) * 150 - 15} stroke="currentColor" className="text-black/[0.04] dark:text-white/[0.04]" strokeDasharray="4 6" />
                          ))}
                          
                          <polyline 
                            points={data.retention.map((p, idx) => {
                              const x = data.retention.length === 1 ? 500 : (idx / (data.retention.length - 1)) * 1000;
                              const y = 180 - (p.rate / 100) * 150 - 15;
                              return `${x},${y}`;
                            }).join(" ")} 
                            fill="none" 
                            stroke="#0066cc" 
                            strokeWidth="2.5" 
                            vectorEffect="non-scaling-stroke" 
                            className="dark:stroke-[#2997ff]"
                          />
                        </svg>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] font-semibold text-center border-t border-[#e0e0e0] dark:border-white/5 pt-3">
                          <span className="text-[#7a7a7a] dark:text-[#cccccc]">Início <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(data.retention[0]?.rate ?? 0, true)}</b></span>
                          <span className="text-[#7a7a7a] dark:text-[#cccccc]">Pitch <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(pitchRetention, true)}</b></span>
                          <span className="text-[#7a7a7a] dark:text-[#cccccc]">Final <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(data.summary.completionRate, true)}</b></span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb size={18} className="text-amber-500" />
                        <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Diagnóstico inteligente</h2>
                      </div>
                      <div className="grid gap-3">
                        {(data.insights.length ? data.insights : [{ tone: "success", title: "Operação estável", detail: "Nenhuma anomalia relevante foi detectada neste período." }]).map((insight) => {
                          const borderClass = 
                            insight.tone === "success" ? "border-emerald-500/20 bg-emerald-500/[0.02]" :
                            insight.tone === "warning" ? "border-amber-500/20 bg-amber-500/[0.02]" :
                            insight.tone === "error" ? "border-red-500/20 bg-red-500/[0.02]" :
                            "border-blue-500/20 bg-blue-500/[0.02]";
                          const dotClass = 
                            insight.tone === "success" ? "bg-emerald-500" :
                            insight.tone === "warning" ? "bg-amber-500" :
                            insight.tone === "error" ? "bg-red-500" :
                            "bg-blue-500";
                          return (
                            <article key={insight.title} className={`rounded-[11px] border p-4 transition-all duration-300 ${borderClass}`}>
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                                <strong className="font-semibold text-[#1d1d1f] dark:text-[#ffffff] text-[13px]">{insight.title}</strong>
                              </div>
                              <p className="mt-1 text-[12px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">{insight.detail}</p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* TAB 2: RETENÇÃO INTERATIVA (REORGANIZADO CONFORME FEEDBACK) */}
              {tab === "retention" && (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-3">
                    
                    {/* Unified Interactive Retention Graph & Video Player Card */}
                    <article className="lg:col-span-2 rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] shadow-none flex flex-col justify-between">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div>
                          <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Curva de Retenção Interativa</h2>
                          <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Passe o cursor sobre a área do vídeo para inspecionar os marcos e clique para navegar no tempo correspondente.</p>
                        </div>
                        <span className="rounded-full bg-[#0066cc]/10 px-3 py-1 text-[11px] font-bold text-[#0066cc] uppercase tracking-wider dark:bg-[#2997ff]/10 dark:text-[#2997ff]">
                          {data.retention.length} marcos
                        </span>
                      </div>

                      {/* Unified Video & Graph Container - Auto-resizing wrapper */}
                      <div className="relative bg-[#000000] rounded-[11px] overflow-hidden flex items-center justify-center p-0 w-full">
                        <div 
                          className="relative w-full flex items-center justify-center"
                          style={videoRatio ? { maxWidth: `calc(min(100%, ${500 * videoRatio}px))` } : { maxWidth: "100%" }}
                        >
                          <div 
                            className="relative w-full"
                            style={videoRatio ? { aspectRatio: `${videoRatio}` } : {}}
                          >
                            {data.video.source ? (
                              <video 
                                ref={videoRef} 
                                src={data.video.source} 
                                controls 
                                preload="metadata" 
                                playsInline 
                                className="w-full h-full object-contain"
                                onLoadedMetadata={(e) => {
                                  const video = e.currentTarget;
                                  if (video.videoHeight > 0) {
                                    setVideoRatio(video.videoWidth / video.videoHeight);
                                  }
                                }}
                              />
                            ) : (
                              <div className="text-[13px] text-white/55 h-[300px] flex items-center justify-center">Prévia do vídeo indisponível</div>
                            )}

                            {/* Interactive Pad Overlay (covers everything EXCEPT the native controls bar at the bottom) */}
                            {data.video.source && (
                              <div 
                                className="absolute inset-x-0 top-0 h-[calc(100%-48px)] cursor-crosshair z-10"
                                onMouseMove={(e) => {
                                  if (!data.retention.length) return;
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const clientX = e.clientX - rect.left;
                                  const clientY = e.clientY - rect.top;

                                  const percent = clientX / rect.width;
                                  let closestIndex = 0;
                                  let minDiff = Infinity;
                                  data.retention.forEach((p, index) => {
                                    const diff = Math.abs((p.point / 100) - percent);
                                    if (diff < minDiff) {
                                      minDiff = diff;
                                      closestIndex = index;
                                    }
                                  });

                                  setHoverIndex(closestIndex);
                                  setTooltipPos({ x: clientX, y: clientY });
                                }}
                                onMouseLeave={() => setHoverIndex(null)}
                                onClick={() => {
                                  if (hoverIndex !== null && data.retention[hoverIndex] && videoRef.current) {
                                    const percent = data.retention[hoverIndex].point / 100;
                                    videoRef.current.currentTime = percent * (data.video.duration_seconds ?? 0);
                                    videoRef.current.play().catch(() => {});
                                  }
                                }}
                              />
                            )}

                            {/* SVG Graph Overlay (100% matched to the video's actual dimensions) */}
                            {data.video.source && (
                              <svg 
                                viewBox="0 0 1000 360" 
                                preserveAspectRatio="none" 
                                className="absolute inset-0 w-full h-full p-4 pb-12 pointer-events-none z-0 overflow-visible"
                              >
                                <defs>
                                  <linearGradient id="overlayRetentionFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#2997ff" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#0066cc" stopOpacity="0.02" />
                                  </linearGradient>
                                </defs>

                                <polygon 
                                  points={(() => {
                                    const linePoints = data.retention.map((p, idx) => {
                                      const x = data.retention.length === 1 ? 500 : (idx / (data.retention.length - 1)) * 1000;
                                      const y = 360 - (p.rate / 100) * 310 - 30; // 30px bottom margin
                                      return `${x},${y}`;
                                    }).join(" ");
                                    return `0,360 ${linePoints} 1000,360`;
                                  })()} 
                                  fill="url(#overlayRetentionFill)" 
                                />

                                <polyline 
                                  points={data.retention.map((p, idx) => {
                                    const x = data.retention.length === 1 ? 500 : (idx / (data.retention.length - 1)) * 1000;
                                    const y = 360 - (p.rate / 100) * 310 - 30;
                                    return `${x},${y}`;
                                  }).join(" ")} 
                                  fill="none" 
                                  stroke="#2997ff" 
                                  strokeWidth="3.5" 
                                  vectorEffect="non-scaling-stroke" 
                                />

                                {hoverIndex !== null && data.retention[hoverIndex] && (
                                  <>
                                    <line 
                                      x1={(hoverIndex / (data.retention.length - 1)) * 1000} 
                                      y1={0} 
                                      x2={(hoverIndex / (data.retention.length - 1)) * 1000} 
                                      y2={360} 
                                      stroke="#ffffff" 
                                      strokeWidth={1.5} 
                                      strokeDasharray="4 4" 
                                      className="opacity-60"
                                    />
                                    <circle 
                                      cx={(hoverIndex / (data.retention.length - 1)) * 1000} 
                                      cy={360 - (data.retention[hoverIndex].rate / 100) * 310 - 30} 
                                      r={7} 
                                      fill="#2997ff" 
                                      stroke="#ffffff" 
                                      strokeWidth={2} 
                                    />
                                  </>
                                )}
                              </svg>
                            )}

                            {/* Floating Tooltip */}
                            {hoverIndex !== null && data.retention[hoverIndex] && (
                              <div 
                                className="absolute pointer-events-none z-20 rounded-[11px] border border-white/10 bg-[#252527]/95 px-3 py-2 shadow-xl backdrop-blur-md text-[11px] text-white"
                                style={{ 
                                  left: `${tooltipPos.x}px`, 
                                  top: `${Math.max(20, tooltipPos.y - 15)}px`, 
                                  transform: 'translate(-50%, -100%)' 
                                }}
                              >
                                <div className="font-semibold">{data.retention[hoverIndex].point}% do vídeo</div>
                                <div className="text-[10px] text-slate-300 mt-0.5">
                                  Tempo: {formatTime((data.retention[hoverIndex].point / 100) * (data.video.duration_seconds ?? 0))}
                                </div>
                                <div className="font-bold text-[#2997ff] mt-1">
                                  Retenção: {data.retention[hoverIndex].rate}%
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>

                    {/* Stats Sidebar */}
                    <div className="flex flex-col gap-4">
                      <article className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] flex-1 flex flex-col justify-between shadow-none">
                        <div>
                          <p className="text-[11px] font-bold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">Retenção média</p>
                          <strong className="mt-1 block text-[32px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{format(averageRetention, true)}</strong>
                          <p className="mt-1 text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Média geral da atenção retida</p>
                        </div>
                        <div className="mt-4 h-12 w-full">
                          <MiniSparkline values={retentionSpark} color="#10b981" />
                        </div>
                      </article>
                      
                      <article className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
                        <p className="text-[11px] font-bold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">Primeira queda forte</p>
                        <strong className="mt-1 block text-[32px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{firstDrop ? `${firstDrop.point}%` : "Estável"}</strong>
                        <p className="mt-1 text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">
                          {firstDrop ? `Retenção caiu abaixo de 70% no marco ${firstDrop.point}%` : "Atenção manteve-se acima de 70%"}
                        </p>
                      </article>

                      <article className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
                        <p className="text-[11px] font-bold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">Retenção no Pitch (75%)</p>
                        <strong className="mt-1 block text-[32px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{format(pitchRetention, true)}</strong>
                        <p className="mt-1 text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Pessoas ativas na hora da oferta</p>
                      </article>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FUNIL REDESENHADO */}
              {tab === "funnel" && (
                <section className="rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] sm:p-6">
                  <div className="mb-6">
                    <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Funil de Conversão da VSL</h2>
                    <p className="text-[13px] text-[#7a7a7a] dark:text-[#cccccc]">Acompanhe a perda de público e as quedas relativas a cada etapa do funil.</p>
                  </div>
                  
                  <div className="space-y-2.5 max-w-4xl font-sans">
                    {data.funnel.map((step, index) => {
                      const pctOfTotal = maxFunnel > 0 ? Math.round((step.value / maxFunnel) * 100) : 0;
                      const prevVal = index > 0 ? data.funnel[index - 1].value : maxFunnel;
                      const pctOfPrev = prevVal > 0 ? Math.round((step.value / prevVal) * 100) : 0;
                      const dropFromPrev = 100 - pctOfPrev;

                      return (
                        <div 
                          key={step.name} 
                          className="group relative grid gap-3 text-[13px] sm:grid-cols-[180px_1fr_120px] sm:items-center sm:gap-4 p-3 rounded-[11px] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-200"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#1d1d1f] dark:text-[#ffffff] text-[14px]">{step.name}</span>
                            <span className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">
                              {index === 0 ? "Visualização inicial" : `${pctOfTotal}% do tráfego total`}
                            </span>
                          </div>

                          <div className="relative h-6 w-full overflow-hidden rounded-full bg-[#f5f5f7] dark:bg-white/[0.04]">
                            <div 
                              className="h-full rounded-full bg-[#0066cc] opacity-90 transition-all duration-500" 
                              style={{ width: `${Math.max(step.value ? 4 : 0, step.value / maxFunnel * 100)}%` }} 
                            />
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                            <strong className="text-[14px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">{format(step.value)}</strong>
                            {index > 0 && dropFromPrev > 0 ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
                                ↓ {dropFromPrev}%
                              </span>
                            ) : (
                              index > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">100%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* TABS 4 & 5: SEGMENTOS */}
              {tab === "audience" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <DimensionTable title="Países" rows={data.dimensions.countries} />
                  <DimensionTable title="Dispositivos" rows={data.dimensions.devices} />
                </div>
              )}
              {tab === "technology" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <DimensionTable title="Sistemas Operacionais" rows={data.dimensions.operatingSystems} />
                  <DimensionTable title="Navegadores" rows={data.dimensions.browsers} />
                </div>
              )}

              {/* TAB 6: AO VIVO */}
              {tab === "live" && (
                <section className="overflow-hidden rounded-[18px] border bg-[#ffffff] border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] p-5 dark:border-white/5">
                    <div>
                      <h2 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Tráfego ao Vivo</h2>
                      <p className="text-[13px] text-[#7a7a7a] dark:text-[#cccccc] font-medium">Países conectados assistindo sua VSL em tempo real.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[12px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400 shadow-none">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                      <span>{data.live} assistindo</span>
                    </div>
                  </div>
                  <div className="grid min-w-0 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative grid min-h-[360px] min-w-0 overflow-hidden place-items-center border-b bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#000000] dark:border-white/5 sm:min-h-[460px] lg:border-b-0 lg:border-r">
                      <div className="w-full min-w-0 max-w-[480px]">
                        <AudienceGlobe countries={activeCountryRows} live={data.live} />
                      </div>
                    </div>
                    
                    <div className="max-h-[520px] min-w-0 overflow-y-auto p-5 divide-y divide-[#f0f0f0] dark:divide-white/5">
                      <div className="mb-4 pb-3 flex items-center justify-between border-b border-[#f0f0f0] dark:border-white/5">
                        <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#ffffff]">Países ativos</h3>
                        <span className="text-[11px] font-semibold text-[#7a7a7a]">últimos minutos</span>
                      </div>
                      
                      <div className="space-y-4 pt-4">
                        {(activeCountryRows.length ? activeCountryRows : [{ name: "Nenhum país conectado agora", impressions: 0, plays: 0, playRate: 0, completes: 0, completionRate: 0 }]).map((row) => (
                          <div key={row.name} className="grid grid-cols-[1fr_96px_60px] items-center gap-3 text-[13px] group">
                            <span className="truncate font-semibold text-[#1d1d1f] dark:text-[#ffffff]">{row.name}</span>
                            <span className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                              <span className="block h-full rounded-full bg-[#0066cc] dark:bg-[#2997ff] transition-all duration-500" style={{ width: `${Math.max(row.impressions ? 4 : 0, (row.impressions / maxCountryViews) * 100)}%` }} />
                            </span>
                            <strong className="text-right font-semibold text-[#1d1d1f] dark:text-[#ffffff]">{format(row.impressions)}</strong>
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

      {/* Floating Backdrop for Sidebar */}
      <div className={`fixed inset-0 z-40 bg-[#000000]/15 backdrop-blur-sm transition-opacity duration-300 ${aiOpen ? "pointer-events-auto opacity-100 xl:pointer-events-none xl:opacity-0" : "pointer-events-none opacity-0"}`} onClick={() => setAiOpen(false)} />
      
      {/* Ask IA Panel Redesigned with Apple Minimalist Style */}
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-[#e0e0e0] bg-[#ffffff] transition-[transform,max-width] duration-300 dark:border-white/[0.06] dark:bg-[#252527] ${aiFullscreen ? "max-w-none" : "max-w-[480px]"} ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex min-h-16 items-center justify-between border-b px-5 border-[#e0e0e0] dark:border-white/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#2997ff]">Prisma IA</p>
            <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">Análise Inteligente</h2>
          </div>
          <div className="relative flex items-center gap-1">
            <button onClick={() => setAiHistoryOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/[0.03] text-slate-500 hover:text-slate-800 dark:hover:bg-white/[0.05] dark:text-[#cccccc] dark:hover:text-white" aria-label="Histórico de conversas">
              <History size={16} />
            </button>
            <button onClick={() => setAiFullscreen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/[0.03] text-slate-500 hover:text-slate-800 dark:hover:bg-white/[0.05] dark:text-[#cccccc] dark:hover:text-white" aria-label={aiFullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"}>
              {aiFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={() => setAiOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/[0.03] text-slate-500 hover:text-slate-800 dark:hover:bg-white/[0.05] dark:text-[#cccccc] dark:hover:text-white" aria-label="Fechar Ask IA">
              <X size={16} />
            </button>

            {aiHistoryOpen && (
              <div className="absolute right-0 top-11 z-20 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-2 shadow-sm dark:border-white/10 dark:bg-[#2a2a2c]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0] dark:border-white/5 mb-1">
                  <strong className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">Histórico</strong>
                  <span className="text-[10px] font-semibold text-[#7a7a7a]">{aiConversations.length} conversas</span>
                </div>
                <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
                  {aiConversations.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[12px] text-[#7a7a7a]">Suas análises aparecerão aqui.</p>
                  ) : (
                    aiConversations.map((conversation) => (
                      <button 
                        key={conversation.id} 
                        type="button" 
                        onClick={() => { setAiQuestion(conversation.question); setAiResult(conversation.result); setAiHistoryOpen(false); }} 
                        className="block w-full rounded-[8px] px-3 py-2 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                      >
                        <span className="block truncate text-[12px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">{conversation.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-[#7a7a7a]">{conversation.question}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f5f5f7] px-4 py-6 dark:bg-[#252527] sm:px-5">
          <div className="mx-auto w-full max-w-3xl rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-5 dark:bg-[#2a2a2c] dark:border-white/5 shadow-none">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0066cc] text-[#ffffff]"><Sparkles size={17} /></span>
              <div>
                <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">Como posso ajudar sua VSL?</h3>
                <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Eu leio as métricas reais e sugiro os próximos passos de conversão.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {suggestionPrompts.map((prompt) => (
                <button key={prompt} onClick={() => void askAi(prompt)} className="rounded-[8px] border border-[#e0e0e0] bg-[#ffffff] px-3 py-2.5 text-left text-[12px] font-semibold text-[#1d1d1f] hover:border-[#0066cc] dark:bg-[#2a2a2c] dark:border-white/5 dark:text-[#ffffff] dark:hover:border-[#2997ff] transition-all">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {aiError && <p className="mx-auto mt-4 max-w-3xl rounded-[11px] bg-red-500/10 p-3.5 text-[12px] font-semibold text-red-600 border border-red-500/20">{aiError}</p>}

          {aiLoading && (
            <div className="mx-auto mt-4 max-w-3xl rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-5 dark:bg-[#2a2a2c] dark:border-white/5 shadow-none flex flex-col items-center justify-center text-center">
              <RefreshCw size={20} className="animate-spin text-[#0066cc] dark:text-[#2997ff]" />
              <p className="mt-3 text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">Analisando dados da VSL...</p>
              <p className="text-[11px] text-[#7a7a7a] mt-1">Varrendo curvas de retenção, funis de leads e tráfego...</p>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="mx-auto mt-4 max-w-3xl space-y-4">
              <article className="rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-4 dark:bg-[#2a2a2c] dark:border-white/5 shadow-none">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#2997ff]">{aiResult.headline}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#1d1d1f] dark:text-[#ffffff]">{aiResult.executiveSummary}</p>
              </article>
              
              {aiResult.opportunities.map((item) => (
                <article key={`${item.priority}-${item.title}`} className="rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-4 dark:bg-[#2a2a2c] dark:border-white/5 shadow-none">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.priority === "high" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    Prioridade {item.priority}
                  </span>
                  <h4 className="mt-2.5 font-bold text-[#1d1d1f] dark:text-[#ffffff] text-[14px]">{item.title}</h4>
                  <p className="mt-1 text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">{item.evidence}</p>
                  <div className="mt-3 rounded-[8px] bg-[#f5f5f7] p-3 text-[12px] font-semibold text-[#1d1d1f] dark:bg-[#252527] dark:text-[#ffffff] border border-[#e0e0e0] dark:border-white/5">
                    <strong className="block text-[10px] font-bold text-[#0066cc] dark:text-[#2997ff] uppercase tracking-wider mb-0.5">Ação recomendada</strong>
                    {item.action}
                  </div>
                </article>
              ))}
              
              {aiResult.experiments.length > 0 && (
                <article className="rounded-[11px] border border-[#e0e0e0] bg-[#ffffff] p-4 dark:bg-[#2a2a2c] dark:border-white/5 shadow-none">
                  <h4 className="font-bold text-[14px] text-[#1d1d1f] dark:text-[#ffffff]">Testes sugeridos</h4>
                  <div className="mt-3 space-y-3">
                    {aiResult.experiments.map((experiment) => (
                      <div key={`${experiment.element}-${experiment.hypothesis}`} className="rounded-[8px] bg-[#f5f5f7] p-3 dark:bg-[#252527] border border-[#e0e0e0] dark:border-white/5">
                        <p className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">{experiment.element}</p>
                        <p className="mt-1 text-[11px] text-[#7a7a7a] dark:text-[#cccccc]">{experiment.hypothesis}</p>
                        <p className="mt-2 text-[11px] font-semibold text-[#0066cc] dark:text-[#2997ff]">Métrica de Sucesso: {experiment.successMetric}</p>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-[#ffffff] px-4 py-4 dark:bg-[#252527] border-[#e0e0e0] dark:border-white/5 sm:px-5">
          <div className="mx-auto max-w-3xl">
            <ClaudeChatInput
              onSendMessage={({ message }) => void askAi(message)}
              isLoading={aiLoading}
            />
            <p className="mx-auto mt-3 text-center text-[10px] font-medium text-[#7a7a7a]">A Prisma IA analisa apenas as métricas autorizadas desta VSL.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
