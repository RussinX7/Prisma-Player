"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  Radio,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import ClaudeChatInput from "@/components/ui/claude-style-chat-input";

// Custom charts imports
import {
  FunnelChart,
  RingChart,
  Ring,
  RingCenter,
  RingLegend,
  AreaChart,
  Area,
  Grid,
  AreaXAxis,
  AreaChartTooltip,
  LineChart,
  Line,
  LineGrid,
  LineXAxis,
  LineChartTooltip,
  HeatmapChart,
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapTooltip,
  HeatmapLegend,
  HeatmapInteractionProvider,
  HeatmapInteractionBoundary,
  HEATMAP_DEFAULT_LEVEL_STYLES,
  levelColorsFromStyles,
} from "@/components/charts";
import { buildHeatmapColumns, buildQuantileColorScale } from "@/lib/heatmap-data";
import { StatCardLine } from "@/components/stat-card-line";
import { StatCardChoropleth } from "@/components/stat-card-choropleth";

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
  { id: "heatmap", label: "Mapa de calor", icon: CalendarDays },
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

const FLAGPACK_BASE = "https://flag.vercel.app";
const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

function flagUrl(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (code === "XX" || code === "DESCONHECIDO" || code.length !== 2) {
    return `${FLAGPACK_BASE}/s/UN.svg`;
  }
  return `${FLAGPACK_BASE}/s/${code}.svg`;
}

function getCountryName(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (code === "XX" || code === "DESCONHECIDO" || code.length !== 2) {
    return "Outros/Desconhecido";
  }
  try {
    return regionNames.of(code) ?? countryCode;
  } catch (e) {
    return countryCode;
  }
}

function format(value: number, percent = false) {
  return percent ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : value.toLocaleString("pt-BR");
}

function DimensionTable({ title, rows, isCountry = false, onRowClick }: { title: string; rows: Dimension[]; isCountry?: boolean; onRowClick?: (row: Dimension) => void }) {
  const maxImpressions = useMemo(() => Math.max(...rows.map((r) => r.impressions), 1), [rows]);
  return (
    <section className="rounded-[22px] border bg-white p-5 shadow-sm border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{title}</h3>
        <span className="rounded-full bg-[#0066cc]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#0066cc] dark:bg-[#2997ff]/10 dark:text-[#2997ff]">{rows.length} segmentos</span>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-[13px]">
            <thead className="text-[#7a7a7a] dark:text-[#cccccc]">
              <tr className="border-b border-[#f0f0f0] dark:border-white/5">
                <th className="pb-3 font-semibold">Segmento</th>
                <th className="pb-3 font-semibold text-right">Visualizações</th>
                <th className="pb-3 font-semibold text-right">Plays</th>
                <th className="pb-3 font-semibold text-right">Play rate</th>
                <th className="pb-3 font-semibold text-right">Retenção final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/5">
              {rows.map((row) => (
                <tr 
                  key={row.name} 
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-colors duration-150 ${onRowClick ? "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" : "hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"}`}
                >
                  <td className="py-3 pr-4 font-semibold text-[#1d1d1f] dark:text-[#ffffff]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {isCountry && (
                          <img
                            alt={`Bandeira de ${row.name}`}
                            className="h-3.5 w-5 shrink-0 rounded object-cover"
                            height={14}
                            src={flagUrl(row.name)}
                            width={20}
                          />
                        )}
                        <span className="truncate max-w-[200px] text-[13px]">
                          {isCountry ? getCountryName(row.name) : row.name}
                        </span>
                      </div>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div 
                          className="h-full rounded-full bg-[#0066cc]/60 group-hover:bg-[#0066cc] dark:bg-[#2997ff]/60 dark:group-hover:bg-[#2997ff] transition-all duration-300"
                          style={{ width: `${(row.impressions / maxImpressions) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-500 dark:text-[#a1a1a6]">{format(row.impressions)}</td>
                  <td className="py-3 text-right font-medium text-slate-500 dark:text-[#a1a1a6]">{format(row.plays)}</td>
                  <td className="py-3 text-right font-semibold text-[#0066cc] dark:text-[#2997ff]">{format(row.playRate, true)}</td>
                  <td className="py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{format(row.completionRate, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-[12px] text-[#7a7a7a]">Nenhum segmento detectado neste período.</div>
      )}
    </section>
  );
}

export default function AnalyticsWorkspace({ videoId }: { videoId: string }) {
  const [tab, setTab] = useState("overview");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Chat states
  const [aiOpen, setAiOpen] = useState(false);
  const [aiFullscreen, setAiFullscreen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiConversations, setAiConversations] = useState<AiConversation[]>([]);
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false);
  const [aiError, setAiError] = useState("");

  // Segment detailed view state
  const [activePanel, setActivePanel] = useState<{ type: "metric" | "segment" | "insight" | "retention-pitch" | "live-session"; title: string; subtitle?: string; data: any } | null>(null);

  // Ring chart active hover states
  const [hoveredDevicesIndex, setHoveredDevicesIndex] = useState<number | null>(null);
  const [hoveredBrowsersIndex, setHoveredBrowsersIndex] = useState<number | null>(null);
  const [hoveredOSIndex, setHoveredOSIndex] = useState<number | null>(null);

  // Maximum views for live countries progress bar
  const maxRealValue = useMemo(() => {
    if (!data?.liveCountries?.length) return 1;
    return Math.max(...data.liveCountries.map((r) => r.impressions), 1);
  }, [data]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/${videoId}?days=${days}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [videoId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load chat conversations history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`prisma-ai-conversations:${videoId}`);
      if (saved) setAiConversations(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, [videoId]);

  // Metric series data calculations for StatCardLine
  const metricsSeriesData = useMemo(() => {
    if (!data?.timeline) return { views: [], plays: [], playRate: [], sales: [] };
    
    const views = data.timeline.map((p) => ({ date: p.date, value: p.impressions }));
    const plays = data.timeline.map((p) => ({ date: p.date, value: p.plays }));
    const playRate = data.timeline.map((p) => ({
      date: p.date,
      value: p.impressions > 0 ? (p.plays / p.impressions) * 100 : 0
    }));
    const sales = data.timeline.map((p) => ({ date: p.date, value: p.conversions }));

    return { views, plays, playRate, sales };
  }, [data]);

  const pitchRetention = useMemo(() => {
    if (!data) return 0;
    const point = data.retention.find((p) => p.point === 75);
    return point ? point.rate : data.summary.completionRate;
  }, [data]);

  const activeCountryRows = useMemo(() => {
    if (!data) return [];
    return data.liveCountries;
  }, [data]);

  // Area Chart Data formatted
  const trafficChartData = useMemo(() => {
    if (!data?.timeline) return [];
    return data.timeline.map((p) => ({
      date: p.date,
      label: p.label,
      visitors: p.impressions,
    }));
  }, [data]);

  // Retention Area Chart Data
  const retentionChartData = useMemo(() => {
    if (!data?.retention) return [];
    return data.retention.map((p) => ({
      date: `${p.point}%`,
      label: `${p.point}% do vídeo`,
      visitors: p.rate,
    }));
  }, [data]);

  /**
   * O LineChart posiciona o eixo X por `Date`, mas a retenção é medida em marcos
   * de % assistido. Cada marco vira um dia sintético só para dar ordem e
   * espaçamento; o rótulo real vem de `formatTick`/`rows`, que leem `point`.
   */
  const retentionLineData = useMemo(() => {
    if (!data?.retention) return [];
    return data.retention.map((p, index) => ({
      date: new Date(2000, 0, 1 + index),
      point: p.point,
      rate: p.rate,
      viewers: p.viewers,
    }));
  }, [data]);

  const [heatmapMetric, setHeatmapMetric] = useState<"plays" | "impressions" | "conversions">("plays");

  const heatmapColumns = useMemo(
    () =>
      buildHeatmapColumns(
        (data?.timeline ?? []).map((entry) => ({ date: entry.date, value: entry[heatmapMetric] })),
      ),
    [data, heatmapMetric],
  );

  const heatmapColorScale = useMemo(
    () => buildQuantileColorScale(heatmapColumns, levelColorsFromStyles(HEATMAP_DEFAULT_LEVEL_STYLES)),
    [heatmapColumns],
  );

  // Funnel chart data mapping
  const funnelChartData = useMemo(() => {
    if (!data?.funnel) return [];
    return data.funnel.map((step) => ({
      label: step.name,
      value: step.value,
      displayValue: step.value.toLocaleString("pt-BR"),
    }));
  }, [data]);

  // Ring Charts Data mapping
  const devicesRingData = useMemo(() => {
    if (!data?.dimensions?.devices) return [];
    const total = data.dimensions.devices.reduce((sum, d) => sum + d.impressions, 0);
    return data.dimensions.devices.slice(0, 3).map((d) => ({
      label: d.name,
      value: d.impressions,
      maxValue: total || 1,
    }));
  }, [data]);

  const browsersRingData = useMemo(() => {
    if (!data?.dimensions?.browsers) return [];
    const total = data.dimensions.browsers.reduce((sum, b) => sum + b.impressions, 0);
    return data.dimensions.browsers.slice(0, 3).map((b) => ({
      label: b.name,
      value: b.impressions,
      maxValue: total || 1,
    }));
  }, [data]);

  const osRingData = useMemo(() => {
    if (!data?.dimensions?.operatingSystems) return [];
    const total = data.dimensions.operatingSystems.reduce((sum, o) => sum + o.impressions, 0);
    return data.dimensions.operatingSystems.slice(0, 3).map((o) => ({
      label: o.name,
      value: o.impressions,
      maxValue: total || 1,
    }));
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const headers = ["Data", "Visualizações", "Plays", "Completaram", "Conversões"];
    const rows = data.timeline.map((point) => [
      new Date(point.date).toLocaleDateString("pt-BR"),
      point.impressions,
      point.plays,
      point.completes,
      point.conversions
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics-vsl-${videoId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function askAi(promptText?: string) {
    const q = promptText || aiQuestion;
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiQuestion("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId, prompt: q })
      });
      const payload = await response.json();
      if (!response.ok) {
        const messageByCode: Record<string, string> = {
          credits_exhausted: "Créditos esgotados. Acesse Plano e adicione saldo para consultar.",
          nvidia_not_configured: "A análise por IA está temporariamente indisponível. Tente novamente mais tarde.",
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
    } catch (e) {
      setAiError("Ocorreu uma falha na comunicação com o servidor.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className={`w-full flex-1 flex flex-col min-w-0 bg-transparent text-[#1d1d1f] dark:text-[#ffffff] relative ${aiOpen && !aiFullscreen ? "xl:pr-[480px]" : ""} transition-all duration-300`}>
      
      {/* Page Header actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex min-w-0 flex-row items-center gap-3">
          <Link href="/dashboard/videos" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-prisma-blue text-prisma-blue bg-transparent hover:bg-prisma-blue/5 px-4 text-[13px] font-semibold transition-all active:scale-[0.95] shrink-0">
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-prisma-blue">VSL Desempenho</span>
              <span className="h-1 w-1 rounded-full bg-black/20 dark:bg-white/20" />
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tempo Real
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-[22px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">
              {data?.video.title ?? "Carregando VSL..."}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <select 
            value={days} 
            onChange={(event) => setDays(Number(event.target.value))} 
            aria-label="Período das métricas" 
            className="h-9 rounded-full border bg-white px-4 text-[13px] font-semibold outline-none transition-all hover:bg-slate-50 border-[#e0e0e0] text-[#1d1d1f] dark:bg-[#1d1d1f] dark:border-white/5 dark:text-[#ffffff] dark:hover:bg-[#252527] cursor-pointer"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>

          <button 
            onClick={() => void load()} 
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white border-[#e0e0e0] text-[#1d1d1f] transition-all hover:bg-slate-50 active:scale-[0.95] dark:bg-[#1d1d1f] dark:border-white/5 dark:text-[#ffffff] dark:hover:bg-[#252527]" 
            aria-label="Atualizar"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={exportCsv} 
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-white border-[#e0e0e0] px-4 text-[13px] font-semibold text-[#1d1d1f] transition-all hover:bg-slate-50 active:scale-[0.95] dark:bg-[#1d1d1f] dark:border-white/5 dark:text-[#ffffff] dark:hover:bg-[#252527]" 
            aria-label="Exportar métricas em CSV"
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>

          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

          <button 
            onClick={() => setAiOpen(true)} 
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-prisma-blue px-4 text-[13px] font-semibold text-white transition-all hover:bg-prisma-blue/90 active:scale-[0.95]"
          >
            <Sparkles size={13} /> 
            <span>Ask IA</span>
          </button>
        </div>
      </div>

      {/* Segmented controls tab navigation */}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-[#e0e0e0] bg-[#f5f5f7]/80 p-1 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#252527]/80 max-w-fit select-none">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold tracking-tight transition-all duration-200 ${
                active 
                  ? "bg-prisma-blue text-white shadow-sm" 
                  : "text-[#7a7a7a] hover:bg-black/[0.02] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:bg-white/[0.04] dark:hover:text-white"
              }`}
            >
              <Icon size={14} className={active ? "text-white" : "text-[#7a7a7a] dark:text-[#cccccc]"} /> 
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Body tabs content */}
      <section className="min-w-0 flex-1">
        {loading && !data ? (
          <div className="grid min-h-[400px] place-items-center rounded-[22px] border border-[#e0e0e0] bg-white dark:bg-[#1d1d1f] dark:border-white/5">
            <RefreshCw className="animate-spin text-prisma-blue" />
          </div>
        ) : !data ? (
          <div className="rounded-[22px] border border-[#e0e0e0] bg-white p-10 text-center text-[#7a7a7a] dark:bg-[#1d1d1f] dark:border-white/5">
            Não foi possível carregar os dados. Confira se a VSL possui eventos gravados.
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            
            {/* TAB 1: VISÃO GERAL */}
            {tab === "overview" && (
              <>
                {/* 4 Premium Stat Cards with Sparklines */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCardLine
                    title="Visualizações únicas"
                    value={data.summary.impressions}
                    description="Visitantes na página do player"
                    trend={data.comparison.delta.impressions}
                    data={metricsSeriesData.views}
                    color="var(--chart-1, #0066cc)"
                  />
                  <StatCardLine
                    title="Plays únicos"
                    value={data.summary.plays}
                    description="Reproduções que de fato iniciaram"
                    trend={data.comparison.delta.plays}
                    data={metricsSeriesData.plays}
                    color="var(--chart-2, #10b981)"
                  />
                  <StatCardLine
                    title="Play Rate"
                    value={data.summary.playRate}
                    description="Taxa de clique no Play do vídeo"
                    trend={data.comparison.delta.playRate}
                    data={metricsSeriesData.playRate}
                    color="var(--chart-3, #6366f1)"
                    suffix="%"
                  />
                  <StatCardLine
                    title="Compras atribuídas"
                    value={data.summary.conversions}
                    description="Conversão confirmada via checkout"
                    trend={data.comparison.delta.conversions}
                    data={metricsSeriesData.sales}
                    color="var(--chart-4, #f59e0b)"
                  />
                </section>

                {/* Main AreaChart block (Tráfego e reprodução) */}
                <section className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 sm:p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Tráfego e reprodução</h2>
                      <p className="mt-1 text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Visualizações e acessos registrados dia a dia.</p>
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
                  
                  {/* Bklit Area Chart */}
                  <div className="w-full font-sans">
                    <AreaChart data={trafficChartData} xDataKey="date">
                      <Grid horizontal />
                      <Area
                        dataKey="visitors"
                        fill="var(--chart-line-primary)"
                        fillOpacity={0.35}
                        showMarkers
                        markers={{ radius: 5, ringGap: 2, strokeWidth: 2 }}
                      />
                      <AreaXAxis tickMode="data" />
                      <AreaChartTooltip />
                    </AreaChart>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                  {/* AreaChart showing Retention Curve */}
                  <div className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div>
                        <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Retenção por marco</h2>
                        <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Preservação de audiência retida ao longo da VSL.</p>
                      </div>
                      <TrendingUp className="text-prisma-blue" size={20} />
                    </div>

                    <div className="w-full font-sans">
                      <AreaChart data={retentionChartData} xDataKey="date">
                        <Grid horizontal />
                        <Area
                          dataKey="visitors"
                          fill="var(--chart-line-primary)"
                          fillOpacity={0.35}
                          showMarkers
                          markers={{ radius: 5, ringGap: 2, strokeWidth: 2 }}
                        />
                        <AreaXAxis tickMode="data" />
                        <AreaChartTooltip />
                      </AreaChart>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] font-semibold text-center border-t border-[#e0e0e0] dark:border-white/5 pt-3">
                      <span className="text-[#7a7a7a] dark:text-[#cccccc]">Início <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(data.retention[0]?.rate ?? 0, true)}</b></span>
                      <span className="text-[#7a7a7a] dark:text-[#cccccc]">Pitch <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(pitchRetention, true)}</b></span>
                      <span className="text-[#7a7a7a] dark:text-[#cccccc]">Final <b className="block text-[14px] text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">{format(data.summary.completionRate, true)}</b></span>
                    </div>
                  </div>

                  {/* AI Quick Diagnostic Card */}
                  <div className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb size={18} className="text-amber-500" />
                        <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Diagnóstico inteligente</h2>
                      </div>
                      <div className="grid gap-3">
                        {(data.insights.length ? data.insights : [{ tone: "success", title: "Operação estável", detail: "Nenhuma anomalia relevante foi detectada neste período." }]).map((insight) => {
                          const borderClass = 
                            insight.tone === "success" ? "border-emerald-500/20 bg-emerald-500/[0.02]" :
                            insight.tone === "warning" ? "border-amber-500/20 bg-amber-500/[0.02]" :
                            insight.tone === "error" ? "border-red-500/20 bg-red-500/[0.02]" :
                            "border-prisma-blue/20 bg-prisma-blue/[0.02]";
                          const dotClass = 
                            insight.tone === "success" ? "bg-emerald-500" :
                            insight.tone === "warning" ? "bg-amber-500" :
                            insight.tone === "error" ? "bg-red-500" :
                            "bg-prisma-blue";
                          return (
                            <article 
                              key={insight.title} 
                              onClick={() => setActivePanel({ type: "insight", title: insight.title, data: insight })}
                              className={`rounded-[12px] border p-4 transition-all duration-300 cursor-pointer hover:border-prisma-blue/40 active:scale-[0.98] ${borderClass}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                                <strong className="font-semibold text-[#1d1d1f] dark:text-[#ffffff] text-[13px]">{insight.title}</strong>
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">{insight.detail}</p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* TAB 2: RETENÇÃO INTERATIVA */}
            {tab === "retention" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  
                  {/* Interactive Retention Graph Card */}
                  <article className="lg:col-span-2 rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div>
                        <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Curva de Retenção Interativa</h2>
                        <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Passe o cursor sobre a curva para inspecionar a retenção em cada marco temporal.</p>
                      </div>
                      <span className="rounded-full bg-prisma-blue/10 px-3 py-1 text-[11px] font-bold text-prisma-blue uppercase tracking-wider">
                        {data.retention.length} marcos
                      </span>
                    </div>

                    {/* Curva de retenção no LineChart (visx) */}
                    <div className="relative h-[340px] overflow-hidden rounded-xl bg-[#f5f5f7] dark:bg-[#252527] border border-[#e0e0e0] dark:border-white/5 p-2 transition-colors">
                      <LineChart
                        data={retentionLineData}
                        xDataKey="date"
                        margin={{ top: 24, right: 28, bottom: 34, left: 46 }}
                        className="h-full w-full"
                      >
                        <LineGrid horizontal />
                        <Line dataKey="rate" stroke="var(--prisma-blue, #0066cc)" strokeWidth={2.5} />
                        <LineXAxis formatTick={(_date, index) => `${retentionLineData[index]?.point ?? 0}%`} />
                        <LineChartTooltip
                          showDatePill={false}
                          rows={(point) => [
                            { color: "var(--prisma-blue, #0066cc)", label: `${point.point as number}% do vídeo`, value: format(point.rate as number, true) },
                            { color: "var(--color-ink-muted-48, #a1a1a6)", label: "Espectadores", value: format(point.viewers as number) },
                          ]}
                        />
                      </LineChart>
                    </div>
                  </article>

                  {/* Sidebar Retention Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <article 
                      onClick={() => setActivePanel({ type: "retention-pitch", title: "Retenção Inicial (10%)", data: { pitch: data.retention.find(p => p.point === 10)?.rate ?? 0 } })}
                      className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 cursor-pointer hover:border-prisma-blue/40 active:scale-[0.98] transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">Retenção Inicial (10%)</p>
                        <strong className="mt-1 block text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{format(data.retention.find(p => p.point === 10)?.rate ?? 0, true)}</strong>
                      </div>
                      <p className="mt-3 text-[11px] text-[#7a7a7a] dark:text-[#cccccc] border-t border-[#f0f0f0] dark:border-white/5 pt-2">Espectadores nos segundos iniciais</p>
                    </article>

                    <article 
                      onClick={() => setActivePanel({ type: "retention-pitch", title: "Retenção no Pitch (75%)", data: { pitch: pitchRetention } })}
                      className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 cursor-pointer hover:border-prisma-blue/40 active:scale-[0.98] transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider">Retenção no Pitch (75%)</p>
                        <strong className="mt-1 block text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">{format(pitchRetention, true)}</strong>
                      </div>
                      <p className="mt-3 text-[11px] text-[#7a7a7a] dark:text-[#cccccc] border-t border-[#f0f0f0] dark:border-white/5 pt-2">Pessoas ativas na hora da oferta</p>
                    </article>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FUNIL */}
            {tab === "funnel" && (
              <section className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 sm:p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Funil de Conversão da VSL</h2>
                  <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Perda de público e taxas de conversão relativas a cada etapa.</p>
                </div>
                
                {/* Advanced Bklit Funnel Chart Integration */}
                <div className="w-full py-2">
                  <FunnelChart
                    data={funnelChartData}
                    color="var(--chart-1, #0066cc)"
                    layers={3}
                  />
                </div>
              </section>
            )}

            {tab === "heatmap" && (
              <section className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 sm:p-6 shadow-sm">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Mapa de Calor da VSL</h2>
                    <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Intensidade por dia da semana. Revela em que dias a VSL realmente performa.</p>
                  </div>
                  <div className="flex gap-1 rounded-full border p-1 border-[#e0e0e0] dark:border-white/10">
                    {([["plays", "Plays"], ["impressions", "Impressões"], ["conversions", "Conversões"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setHeatmapMetric(id)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${heatmapMetric === id ? "bg-prisma-blue text-white" : "text-[#7a7a7a] hover:text-[#1d1d1f] dark:text-[#cccccc] dark:hover:text-white"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {heatmapColumns.length ? (
                  <HeatmapInteractionProvider>
                    <HeatmapInteractionBoundary>
                      <div className="flex w-full flex-col items-stretch gap-3">
                        <HeatmapChart
                          className="w-full"
                          data={heatmapColumns}
                          layout="fluid"
                          colorScale={heatmapColorScale}
                          levelStyles={HEATMAP_DEFAULT_LEVEL_STYLES}
                        >
                          <HeatmapCells />
                          <HeatmapXAxis />
                          <HeatmapYAxis />
                          <HeatmapTooltip instant />
                        </HeatmapChart>
                        <HeatmapLegend levelStyles={HEATMAP_DEFAULT_LEVEL_STYLES} />
                      </div>
                    </HeatmapInteractionBoundary>
                  </HeatmapInteractionProvider>
                ) : (
                  <p className="py-16 text-center text-[13px] text-[#7a7a7a] dark:text-[#cccccc]">Ainda não há dados suficientes no período selecionado.</p>
                )}
              </section>
            )}

            {/* TAB 4: PÚBLICO */}
            {tab === "audience" && (
              <div className="grid gap-6 md:grid-cols-2">
                <DimensionTable title="Países de Origem" rows={data.dimensions.countries} isCountry={true} onRowClick={(row) => setActivePanel({ type: "segment", title: row.name, subtitle: "Países", data: row })} />
                <DimensionTable title="Fontes de Tráfego" rows={data.dimensions.traffic} onRowClick={(row) => setActivePanel({ type: "segment", title: row.name, subtitle: "Fontes de Tráfego", data: row })} />
              </div>
            )}

            {/* TAB 5: TECNOLOGIA */}
            {tab === "technology" && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Dispositivos Ring Chart */}
                <div className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">Dispositivos</h3>
                    <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc] mt-0.5">Visitas segmentadas por tipo de hardware</p>
                  </div>
                  <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-center">
                    <RingChart 
                      data={devicesRingData} 
                      size={180}
                      hoveredIndex={hoveredDevicesIndex}
                      onHoverChange={setHoveredDevicesIndex}
                    >
                      {devicesRingData.map((item, index) => (
                        <Ring key={item.label} index={index} />
                      ))}
                      <RingCenter defaultLabel="Visitas" />
                    </RingChart>
                    <RingLegend 
                      data={devicesRingData}
                      hoveredIndex={hoveredDevicesIndex}
                      onHoverChange={setHoveredDevicesIndex}
                      className="w-full xl:w-auto"
                    />
                  </div>
                </div>

                {/* Navegadores Ring Chart */}
                <div className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">Navegadores</h3>
                    <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc] mt-0.5">Uso relativo de navegadores web</p>
                  </div>
                  <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-center">
                    <RingChart 
                      data={browsersRingData} 
                      size={180}
                      hoveredIndex={hoveredBrowsersIndex}
                      onHoverChange={setHoveredBrowsersIndex}
                    >
                      {browsersRingData.map((item, index) => (
                        <Ring key={item.label} index={index} />
                      ))}
                      <RingCenter defaultLabel="Visitas" />
                    </RingChart>
                    <RingLegend 
                      data={browsersRingData}
                      hoveredIndex={hoveredBrowsersIndex}
                      onHoverChange={setHoveredBrowsersIndex}
                      className="w-full xl:w-auto"
                    />
                  </div>
                </div>

                {/* Sistemas Operacionais Ring Chart */}
                <div className="rounded-[22px] border bg-white p-5 border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">Sistemas Operacionais</h3>
                    <p className="text-[11px] text-[#7a7a7a] dark:text-[#cccccc] mt-0.5">Sistemas utilizados para acessar o vídeo</p>
                  </div>
                  <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-center">
                    <RingChart 
                      data={osRingData} 
                      size={180}
                      hoveredIndex={hoveredOSIndex}
                      onHoverChange={setHoveredOSIndex}
                    >
                      {osRingData.map((item, index) => (
                        <Ring key={item.label} index={index} />
                      ))}
                      <RingCenter defaultLabel="Visitas" />
                    </RingChart>
                    <RingLegend 
                      data={osRingData}
                      hoveredIndex={hoveredOSIndex}
                      onHoverChange={setHoveredOSIndex}
                      className="w-full xl:w-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: AO VIVO */}
            {tab === "live" && (
              <section className="overflow-hidden rounded-[22px] border bg-white border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] p-5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  <div>
                    <h2 className="text-[16px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Tráfego ao Vivo</h2>
                    <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Conexões em tempo real assistindo sua VSL neste instante.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    <span>{data.live} assistindo</span>
                  </div>
                </div>
                
                {/* Advanced Bklit Choropleth Map and live feed */}
                <div className="grid min-w-0 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="p-5 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#e0e0e0] dark:border-white/5 bg-[#fcfcfd] dark:bg-[#0e0e0f]">
                    <StatCardChoropleth 
                      title="Geolocalização do Tráfego Real"
                      liveCountries={activeCountryRows} 
                      totalLive={data.live}
                    />
                  </div>
                  
                  <div className="max-h-[500px] min-w-0 overflow-y-auto p-5 divide-y divide-[#f0f0f0] dark:divide-white/5">
                    <div className="mb-4 pb-3 flex items-center justify-between border-b border-[#f0f0f0] dark:border-white/5">
                      <h3 className="font-semibold text-[13px] text-[#1d1d1f] dark:text-[#ffffff]">Cidades/Países Ativos</h3>
                      <span className="text-[10px] font-semibold text-[#7a7a7a]">últimos minutos</span>
                    </div>
                    
                    <div className="space-y-4 pt-4">
                      {(activeCountryRows.length ? activeCountryRows : [{ name: "Sem sessões ativas", impressions: 0, plays: 0, playRate: 0, completes: 0, completionRate: 0 }]).map((row) => (
                        <div 
                          key={row.name} 
                          onClick={() => row.impressions > 0 && setActivePanel({ type: "live-session", title: row.name, data: row })}
                          className={`grid grid-cols-[1fr_96px_60px] items-center gap-3 text-[13px] group ${
                            row.impressions > 0 ? "cursor-pointer hover:text-prisma-blue active:scale-[0.98] transition-all" : ""
                          }`}
                        >
                          <span className="truncate font-semibold text-[#1d1d1f] dark:text-[#ffffff] group-hover:text-prisma-blue flex items-center gap-2">
                            {row.impressions > 0 && row.name !== "Sem sessões ativas" && (
                              <img
                                alt=""
                                className="h-3 w-4 shrink-0 rounded object-cover"
                                height={12}
                                src={flagUrl(row.name)}
                                width={16}
                              />
                            )}
                            {row.impressions > 0 && row.name !== "Sem sessões ativas" ? getCountryName(row.name) : row.name}
                          </span>
                          <span className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <span className="block h-full rounded-full bg-[#0066cc] dark:bg-[#2997ff] transition-all duration-500" style={{ width: `${Math.max(row.impressions ? 4 : 0, (row.impressions / maxRealValue) * 100)}%` }} />
                          </span>
                          <strong className="text-right font-semibold text-[#1d1d1f] dark:text-[#ffffff] group-hover:text-prisma-blue">{format(row.impressions)}</strong>
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

      {/* Floating Backdrop for AI Chat Panel */}
      <div className={`fixed inset-0 z-40 bg-[#000000]/15 backdrop-blur-sm transition-opacity duration-300 ${aiOpen ? "pointer-events-auto opacity-100 xl:pointer-events-none xl:opacity-0" : "pointer-events-none opacity-0"}`} onClick={() => setAiOpen(false)} />
      
      {/* Ask IA Panel */}
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-[#e0e0e0] bg-white transition-[transform,max-width] duration-300 dark:border-white/[0.06] dark:bg-[#1d1d1f] ${aiFullscreen ? "max-w-none" : "max-w-[480px]"} ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex min-h-16 items-center justify-between border-b px-5 border-[#e0e0e0] dark:border-white/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-prisma-blue">Prisma IA</p>
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
              <div className="absolute right-0 top-11 z-20 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[#e0e0e0] bg-[#ffffff] p-2 shadow-xl dark:border-white/10 dark:bg-[#2a2a2c]">
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

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-[#151516] sm:px-5">
          <div className="mx-auto w-full max-w-3xl rounded-[16px] border border-[#e0e0e0] bg-white p-5 dark:bg-[#2a2a2c] dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-prisma-blue text-white"><Sparkles size={17} /></span>
              <div>
                <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">Como posso ajudar sua VSL?</h3>
                <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc]">Consulte insights baseados nas métricas reais de tráfego e conversão.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {suggestionPrompts.map((prompt) => (
                <button key={prompt} onClick={() => void askAi(prompt)} className="rounded-[11px] border border-[#e0e0e0] bg-white px-3 py-2.5 text-left text-[12px] font-semibold text-[#1d1d1f] hover:border-prisma-blue dark:bg-[#2a2a2c] dark:border-white/5 dark:text-[#ffffff] dark:hover:border-prisma-blue transition-all cursor-pointer">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {aiError && <p className="mx-auto mt-4 max-w-3xl rounded-[11px] bg-red-500/10 p-3.5 text-[12px] font-semibold text-red-600 border border-red-500/20">{aiError}</p>}

          {aiResult && (
            <div className="mx-auto mt-4 w-full max-w-3xl space-y-4 font-sans animate-fade-in">
              <article className="rounded-[16px] border bg-white p-5 dark:bg-[#2a2a2c] border-[#e0e0e0] dark:border-white/5 shadow-sm">
                <h3 className="text-[16px] font-bold text-prisma-blue flex items-center gap-1.5"><Sparkles size={16} /> {aiResult.headline}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">{aiResult.executiveSummary}</p>
              </article>

              {aiResult.warnings.length > 0 && (
                <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/5 p-5">
                  <h4 className="text-[13px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Pontos de Atenção</h4>
                  <ul className="list-disc pl-4 text-[12px] leading-relaxed text-amber-700 dark:text-amber-300 space-y-1">
                    {aiResult.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider pl-1">Oportunidades Recomendadas</h4>
                {aiResult.opportunities.map((op, index) => {
                  const badgeColor = 
                    op.priority === "high" ? "bg-red-500/10 text-red-600" :
                    op.priority === "medium" ? "bg-amber-500/10 text-amber-600" :
                    "bg-blue-500/10 text-blue-600";
                  return (
                    <article key={index} className="rounded-[16px] border bg-white p-5 dark:bg-[#2a2a2c] border-[#e0e0e0] dark:border-white/5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-[14px] font-bold text-[#1d1d1f] dark:text-white">{op.title}</strong>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>{op.priority}</span>
                      </div>
                      <div className="text-[12px] leading-relaxed text-slate-600 dark:text-[#cccccc] space-y-2">
                        <p><b>Evidência:</b> {op.evidence}</p>
                        <p className="border-t border-[#f0f0f0] dark:border-white/5 pt-2 text-[#0066cc] dark:text-[#2997ff]"><b>Ação sugerida:</b> {op.action}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {aiResult.experiments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-bold text-[#7a7a7a] dark:text-[#cccccc] uppercase tracking-wider pl-1">Próximos Experimentos</h4>
                  {aiResult.experiments.map((exp, index) => (
                    <article key={index} className="rounded-[16px] border bg-white p-5 dark:bg-[#2a2a2c] border-[#e0e0e0] dark:border-white/5 shadow-sm space-y-2 text-[12px] leading-relaxed text-[#1d1d1f] dark:text-white">
                      <p className="font-semibold text-[13px] text-prisma-blue">Variável: {exp.element}</p>
                      <p><b>Hipótese:</b> {exp.hypothesis}</p>
                      <p className="text-emerald-600 dark:text-emerald-400"><b>Métrica de sucesso:</b> {exp.successMetric}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="animate-spin text-prisma-blue" size={24} />
            </div>
          )}
        </div>

        <div className="border-t bg-white p-4 dark:bg-[#1d1d1f] border-[#e0e0e0] dark:border-white/5">
          <ClaudeChatInput
            onSendMessage={(data) => void askAi(data.message)}
            isLoading={aiLoading}
          />
        </div>
      </aside>

      {/* Detail Overlay Drawer */}
      {activePanel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#000000]/30 backdrop-blur-sm transition-opacity" onClick={() => setActivePanel(null)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[24px] border bg-white shadow-2xl animate-scale-up border-[#e0e0e0] dark:bg-[#1d1d1f] dark:border-white/10">
            {/* Header */}
            <div className="flex min-h-16 items-center justify-between border-b px-6 border-[#e0e0e0] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-prisma-blue">{activePanel.subtitle || activePanel.type}</span>
                <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] truncate max-w-[280px]">{activePanel.title}</h3>
              </div>
              <button onClick={() => setActivePanel(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/[0.04] text-slate-500 dark:hover:bg-white/[0.05] dark:text-[#cccccc]" aria-label="Fechar painel">
                <X size={18} />
              </button>
            </div>
            
            {/* Content body */}
            <div className="p-6 max-h-[60dvh] overflow-y-auto min-h-[220px]">
              {/* 1. METRIC DETAILS VIEW */}
              {activePanel.type === "metric" && (
                <div className="space-y-4 font-sans text-[13px]">
                  <p className="leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                    Métrica de <b>{activePanel.title}</b> analisada ao longo dos últimos 30 dias de tráfego ativo na embed.
                  </p>
                  <div className="rounded-xl border p-4 bg-[#f5f5f7] dark:bg-[#252527] border-[#e0e0e0] dark:border-white/5">
                    <span className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider">Valor total</span>
                    <strong className="block text-[32px] font-bold text-[#1d1d1f] dark:text-white mt-1">{activePanel.data.value}{activePanel.data.suffix}</strong>
                    <div className="mt-3 border-t border-black/5 dark:border-white/5 pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#7a7a7a]">Comparado ao período anterior</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${activePanel.data.trend >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        {activePanel.data.trend >= 0 ? "↑" : "↓"} {Math.abs(activePanel.data.trend)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DIAGNOSTIC INSIGHT VIEW */}
              {activePanel.type === "insight" && (
                <div className="space-y-4 font-sans text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      activePanel.data.tone === "success" ? "bg-emerald-500" :
                      activePanel.data.tone === "warning" ? "bg-amber-500" :
                      activePanel.data.tone === "error" ? "bg-red-500" : "bg-prisma-blue"
                    }`} />
                    <strong className="text-[14px] font-bold text-[#1d1d1f] dark:text-white">{activePanel.title}</strong>
                  </div>
                  <p className="leading-relaxed text-slate-600 dark:text-[#cccccc] bg-slate-50 dark:bg-white/[0.01] p-4 rounded-xl border dark:border-white/5">
                    {activePanel.data.detail}
                  </p>
                </div>
              )}

              {/* 3. RETENTION PITCH OVERVIEW */}
              {activePanel.type === "retention-pitch" && (
                <div className="space-y-4 font-sans text-[13px]">
                  <p className="leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                    Taxa percentual de espectadores retidos que assistiram ativamente ao vídeo no momento correspondente.
                  </p>
                  <div className="rounded-xl border p-4 bg-[#f5f5f7] dark:bg-[#252527] border-[#e0e0e0] dark:border-white/5">
                    <span className="text-[11px] font-semibold text-[#7a7a7a] uppercase tracking-wider">Retenção ativa</span>
                    <strong className="block text-[32px] font-bold text-prisma-blue mt-1">{format(activePanel.data.pitch, true)}</strong>
                  </div>
                </div>
              )}

              {/* 4. SEGMENT DETAILED DATA GRID */}
              {activePanel.type === "segment" && (
                <div className="space-y-5 font-sans text-[13px]">
                  <p className="leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                    Detalhes específicos de performance registrados para o segmento <b>{activePanel.title}</b>.
                  </p>
                  <div className="rounded-xl border overflow-hidden border-[#e0e0e0] dark:border-white/5 bg-white dark:bg-[#1d1d1f]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/5 text-[#1d1d1f] dark:text-white">
                          <tr>
                            <td className="p-3 font-semibold">Visualizações</td>
                            <td className="p-3 text-right text-slate-500">{format(activePanel.data.impressions)}</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Plays iniciados</td>
                            <td className="p-3 text-right text-slate-500">{format(activePanel.data.plays)}</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Play Rate</td>
                            <td className="p-3 text-right text-[#0066cc] dark:text-[#2997ff] font-bold">{format(activePanel.data.playRate, true)}</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Completes</td>
                            <td className="p-3 text-right text-slate-500">{format(activePanel.data.completes)}</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Retenção Final</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">{format(activePanel.data.completionRate, true)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. LIVE SESSION STREAM VIEW */}
              {activePanel.type === "live-session" && (
                <div className="space-y-6 font-sans">
                  <p className="text-[13px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                    Monitoramento em tempo real de conexões originadas de <b>{activePanel.title}</b>. Eventos de play, pause, progresso e CTA são transmitidos abaixo.
                  </p>
                  
                  {/* Live logger component */}
                  <LiveSessionLogs videoId={videoId} countryCode={activePanel.title} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t pt-4 border-[#f0f0f0] dark:border-white/5 flex items-center justify-end px-6 pb-4">
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-prisma-blue px-5 text-[13px] font-semibold text-white hover:bg-prisma-blue/90 transition-all active:scale-[0.95] cursor-pointer"
              >
                Concluir Leitura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveSessionLogs({ videoId, countryCode }: { videoId: string; countryCode: string }) {
  const [logs, setLogs] = useState<{ id: string; time: string; event: string; device: string }[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/analytics/${videoId}/live-logs?country=${countryCode}`);
        if (res.ok) {
          const payload = await res.json();
          setLogs(payload.logs || []);
          setActiveCount(payload.activeCount || 0);
        }
      } catch (e) {
        console.error("Erro ao carregar logs reais:", e);
      } finally {
        setLoading(false);
      }
    }

    void fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [videoId, countryCode]);

  return (
    <div className="font-mono bg-[#1d1d1f] text-[#2997ff] p-4 rounded-xl text-[12px] space-y-2.5 h-[280px] overflow-y-auto border border-white/5">
      <div className="text-[10px] text-emerald-400 border-b border-white/10 pb-1.5 flex items-center gap-1.5 font-sans uppercase font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Stream real: {countryCode} · {activeCount} ativo{activeCount === 1 ? "" : "s"}
      </div>
      {loading && logs.length === 0 ? (
        <div className="text-[#7a7a7a] text-[11px] py-4">Buscando tráfego real...</div>
      ) : logs.length === 0 ? (
        <div className="text-[#7a7a7a] text-[11px] py-4">Nenhum evento registrado nos últimos 15 minutos.</div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex gap-2 leading-relaxed animate-fade-in text-[11px]">
            <span className="text-[#7a7a7a]">{log.time}</span>
            <span className="text-[#a1a1a6]">[{log.device}]</span>
            <span className="text-white font-medium">{log.event}</span>
          </div>
        ))
      )}
    </div>
  );
}

// Calculate max country values for sizing
function getMaxRealValue(liveCountries: Dimension[]) {
  if (!liveCountries.length) return 1;
  return Math.max(...liveCountries.map((r) => r.impressions), 1);
}
