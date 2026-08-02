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

const heatmapMetricLabel: Record<"plays" | "impressions" | "conversions", (count: number) => string> = {
  plays: (count) => (count === 1 ? "play" : "plays"),
  impressions: (count) => (count === 1 ? "impressão" : "impressões"),
  conversions: (count) => (count === 1 ? "conversão" : "conversões"),
};

const FUNNEL_RAMP = ["#6366f1", "#8b5cf6", "#a855f7", "#c026d3", "#ec4899", "#f43f5e"];
const HEATMAP_GAP = 4;

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
    <section className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-black text-[#191A23]">{title}</h3>
        <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-3 py-0.5 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
          {rows.length} segmentos
        </span>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border-2 border-[#191A23]">
          <table className="w-full min-w-[500px] text-left text-xs font-bold text-[#191A23]">
            <thead className="bg-[#F3F3F3] font-black uppercase text-[#191A23] border-b-2 border-[#191A23]">
              <tr>
                <th className="p-3.5 font-black">Segmento</th>
                <th className="p-3.5 font-black text-right">Visualizações</th>
                <th className="p-3.5 font-black text-right">Plays</th>
                <th className="p-3.5 font-black text-right">Play rate</th>
                <th className="p-3.5 font-black text-right">Retenção final</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#191A23]/20 font-medium">
              {rows.map((row) => (
                <tr 
                  key={row.name} 
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-colors duration-150 ${onRowClick ? "cursor-pointer hover:bg-[#F3F3F3]" : ""}`}
                >
                  <td className="p-3.5 font-bold text-[#191A23]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {isCountry && (
                          <img
                            alt={`Bandeira de ${row.name}`}
                            className="h-3.5 w-5 shrink-0 rounded object-cover border border-[#191A23]"
                            height={14}
                            src={flagUrl(row.name)}
                            width={20}
                          />
                        )}
                        <span className="truncate max-w-[200px] text-xs font-bold text-[#191A23]">
                          {isCountry ? getCountryName(row.name) : row.name}
                        </span>
                      </div>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full border border-[#191A23] bg-[#F3F3F3]">
                        <div 
                          className="h-full rounded-full bg-[#B9FF66] transition-all duration-300"
                          style={{ width: `${(row.impressions / maxImpressions) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-semibold text-[#191A23]">{format(row.impressions)}</td>
                  <td className="p-3.5 text-right font-semibold text-[#191A23]">{format(row.plays)}</td>
                  <td className="p-3.5 text-right font-black text-[#191A23]">{format(row.playRate, true)}</td>
                  <td className="p-3.5 text-right font-black text-[#191A23]">{format(row.completionRate, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs font-bold text-[#191A23]/60">Nenhum segmento detectado neste período.</div>
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`prisma-ai-conversations:${videoId}`);
      if (saved) setAiConversations(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, [videoId]);

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

  const trafficChartData = useMemo(() => {
    if (!data?.timeline) return [];
    return data.timeline.map((p) => ({
      date: p.date,
      label: p.label,
      visitors: p.impressions,
    }));
  }, [data]);

  const retentionChartData = useMemo(() => {
    if (!data?.retention) return [];
    return data.retention.map((p) => ({
      date: `${p.point}%`,
      label: `${p.point}% do vídeo`,
      visitors: p.rate,
    }));
  }, [data]);

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

  const heatmapBinSize = useMemo(() => {
    const columns = heatmapColumns.length;
    if (!columns) return 16;
    const available = 672 - (columns - 1) * HEATMAP_GAP;
    return Math.max(12, Math.min(34, Math.floor(available / columns)));
  }, [heatmapColumns]);

  const funnelChartData = useMemo(() => {
    if (!data?.funnel) return [];
    return data.funnel.map((step, index) => {
      const from = FUNNEL_RAMP[index % FUNNEL_RAMP.length]!;
      const to = FUNNEL_RAMP[(index + 1) % FUNNEL_RAMP.length]!;
      return {
        label: step.name,
        value: step.value,
        displayValue: step.value.toLocaleString("pt-BR"),
        color: from,
        gradient: [
          { offset: "0%", color: from },
          { offset: "100%", color: to },
        ],
      };
    });
  }, [data]);

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
    <div className={`w-full flex-1 flex flex-col min-w-0 bg-transparent text-[#191A23] relative ${aiOpen && !aiFullscreen ? "xl:pr-[480px]" : ""} transition-all duration-300 space-y-6`}>
      
      {/* Top Header Positivus Style */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[35px] border-2 border-[#191A23] bg-white p-6 shadow-[6px_6px_0px_#191A23]">
        <div className="flex min-w-0 flex-row items-center gap-3">
          <Link href="/dashboard/videos" className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-[#191A23] bg-white px-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]/20 transition-all cursor-pointer shrink-0">
            <ArrowLeft size={15} />
            <span>Voltar</span>
          </Link>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-3 py-0.5 text-[10px] font-black uppercase text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                VSL Desempenho
              </span>
              <span className="text-[10px] font-extrabold text-[#191A23] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#191A23] animate-pulse" />
                Tempo Real
              </span>
            </div>
            <h1 className="truncate text-2xl sm:text-3xl font-black text-[#191A23] tracking-tight">
              {data?.video.title ?? "Carregando VSL..."}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <select 
            value={days} 
            onChange={(event) => setDays(Number(event.target.value))} 
            aria-label="Período das métricas" 
            className="h-10 rounded-full border-2 border-[#191A23] bg-white px-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] outline-none cursor-pointer"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>

          <button 
            onClick={() => void load()} 
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#191A23] bg-white text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]/20 cursor-pointer" 
            aria-label="Atualizar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={exportCsv} 
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#191A23] bg-white px-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]/20 cursor-pointer" 
            aria-label="Exportar métricas em CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          <button 
            onClick={() => setAiOpen(true)} 
            className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-[#191A23] bg-[#B9FF66] px-5 text-xs font-black text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 cursor-pointer"
          >
            <Sparkles size={14} /> 
            <span>Ask IA</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar Positivus Style */}
      <div className="overflow-x-auto pb-1">
        <nav className="flex gap-2 min-w-max rounded-2xl border-2 border-[#191A23] bg-white p-2 shadow-[4px_4px_0px_#191A23]">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition-all cursor-pointer border-2 border-[#191A23] ${
                  active 
                    ? "bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]" 
                    : "bg-white text-[#191A23] hover:bg-[#B9FF66]/20 shadow-[1px_1px_0px_#191A23]"
                }`}
              >
                <Icon size={15} className="text-[#191A23]" /> 
                <span className="text-[#191A23] font-black">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Tab Content */}
      <section className="min-w-0 flex-1">
        {loading && !data ? (
          <div className="grid min-h-[400px] place-items-center rounded-[30px] border-2 border-[#191A23] bg-white shadow-[4px_4px_0px_#191A23]">
            <RefreshCw className="animate-spin text-[#191A23]" size={28} />
          </div>
        ) : !data ? (
          <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-10 text-center font-bold text-xs text-[#191A23]/70 shadow-[4px_4px_0px_#191A23]">
            Não foi possível carregar os dados. Confira se a VSL possui eventos gravados.
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TAB 1: VISÃO GERAL */}
            {tab === "overview" && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCardLine
                    title="Visualizações únicas"
                    value={data.summary.impressions}
                    description="Visitantes na página do player"
                    trend={data.comparison.delta.impressions}
                    data={metricsSeriesData.views}
                    color="#191A23"
                  />
                  <StatCardLine
                    title="Plays únicos"
                    value={data.summary.plays}
                    description="Reproduções que iniciaram"
                    trend={data.comparison.delta.plays}
                    data={metricsSeriesData.plays}
                    color="#191A23"
                  />
                  <StatCardLine
                    title="Play Rate"
                    value={data.summary.playRate}
                    description="Taxa de clique no Play"
                    trend={data.comparison.delta.playRate}
                    data={metricsSeriesData.playRate}
                    color="#191A23"
                    suffix="%"
                  />
                  <StatCardLine
                    title="Compras atribuídas"
                    value={data.summary.conversions}
                    description="Conversão confirmada via checkout"
                    trend={data.comparison.delta.conversions}
                    data={metricsSeriesData.sales}
                    color="#191A23"
                  />
                </section>

                <section className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-[#191A23]">Tráfego e Reprodução Diária</h2>
                      <p className="mt-0.5 text-xs font-medium text-[#191A23]/70">Visualizações e acessos registrados dia a dia.</p>
                    </div>
                    <div className="flex gap-6 text-right text-xs">
                      <span>
                        <b className="block text-xl font-black text-[#191A23]">{format(data.summary.reached75)}</b>
                        <i className="not-italic font-bold text-[#191A23]/70">chegaram à oferta</i>
                      </span>
                      <span>
                        <b className="block text-xl font-black text-[#191A23]">{format(data.summary.conversions)}</b>
                        <i className="not-italic font-bold text-[#191A23]/70">conversões</i>
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full font-sans">
                    <AreaChart data={trafficChartData} xDataKey="date">
                      <Grid horizontal />
                      <Area
                        dataKey="visitors"
                        fill="#B9FF66"
                        fillOpacity={0.5}
                        showMarkers
                        markers={{ radius: 5, ringGap: 2, strokeWidth: 2 }}
                      />
                      <AreaXAxis tickMode="data" />
                      <AreaChartTooltip />
                    </AreaChart>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div>
                        <h2 className="text-lg font-black text-[#191A23]">Curva de Retenção por Marco</h2>
                        <p className="text-xs font-medium text-[#191A23]/70">Preservação de audiência ao longo da VSL.</p>
                      </div>
                      <TrendingUp className="text-[#191A23]" size={22} />
                    </div>

                    <div className="w-full font-sans">
                      <AreaChart data={retentionChartData} xDataKey="date">
                        <Grid horizontal />
                        <Area
                          dataKey="visitors"
                          fill="#B9FF66"
                          fillOpacity={0.5}
                          showMarkers
                          markers={{ radius: 5, ringGap: 2, strokeWidth: 2 }}
                        />
                        <AreaXAxis tickMode="data" />
                        <AreaChartTooltip />
                      </AreaChart>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-bold text-center border-t-2 border-[#191A23]/10 pt-4">
                      <span className="text-[#191A23]/70">Início <b className="block text-base font-black text-[#191A23] mt-0.5">{format(data.retention[0]?.rate ?? 0, true)}</b></span>
                      <span className="text-[#191A23]/70">Pitch <b className="block text-base font-black text-[#191A23] mt-0.5">{format(pitchRetention, true)}</b></span>
                      <span className="text-[#191A23]/70">Final <b className="block text-base font-black text-[#191A23] mt-0.5">{format(data.summary.completionRate, true)}</b></span>
                    </div>
                  </div>

                  <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]">
                          <Lightbulb size={18} />
                        </div>
                        <h2 className="text-lg font-black text-[#191A23]">Diagnóstico Inteligente</h2>
                      </div>
                      <div className="grid gap-3">
                        {(data.insights.length ? data.insights : [{ tone: "success", title: "Operação estável", detail: "Nenhuma anomalia relevante foi detectada neste período." }]).map((insight) => (
                          <article 
                            key={insight.title} 
                            onClick={() => setActivePanel({ type: "insight", title: insight.title, data: insight })}
                            className="rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3] p-4 cursor-pointer hover:bg-white shadow-[2px_2px_0px_#191A23] transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#191A23]" />
                              <strong className="font-black text-[#191A23] text-xs">{insight.title}</strong>
                            </div>
                            <p className="mt-1 text-xs font-medium text-[#191A23]/80 leading-relaxed">{insight.detail}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* TAB 2: RETENÇÃO */}
            {tab === "retention" && (
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  <article className="lg:col-span-2 rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div>
                        <h2 className="text-lg font-black text-[#191A23]">Curva de Retenção Interativa</h2>
                        <p className="text-xs font-medium text-[#191A23]/70">Passe o cursor sobre a curva para inspecionar a retenção em cada marco temporal.</p>
                      </div>
                      <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                        {data.retention.length} marcos
                      </span>
                    </div>

                    <div className="relative h-[340px] overflow-hidden rounded-2xl border-2 border-[#191A23] bg-[#F3F3F3] p-3">
                      <LineChart
                        data={retentionLineData}
                        xDataKey="date"
                        margin={{ top: 24, right: 28, bottom: 34, left: 46 }}
                        className="h-full w-full"
                      >
                        <LineGrid horizontal />
                        <Line dataKey="rate" stroke="#191A23" strokeWidth={3} />
                        <LineXAxis formatTick={(_date, index) => `${retentionLineData[index]?.point ?? 0}%`} />
                        <LineChartTooltip
                          showDatePill={false}
                          rows={(point) => [
                            { color: "#191A23", label: `${point.point as number}% do vídeo`, value: format(point.rate as number, true) },
                            { color: "#191A23", label: "Espectadores", value: format(point.viewers as number) },
                          ]}
                        />
                      </LineChart>
                    </div>
                  </article>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <article 
                      onClick={() => setActivePanel({ type: "retention-pitch", title: "Retenção Inicial (10%)", data: { pitch: data.retention.find(p => p.point === 10)?.rate ?? 0 } })}
                      className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[3px_3px_0px_#191A23] cursor-pointer hover:bg-[#B9FF66]/20 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#191A23]/70">Retenção Inicial (10%)</p>
                        <strong className="mt-2 block text-3xl font-black text-[#191A23]">{format(data.retention.find(p => p.point === 10)?.rate ?? 0, true)}</strong>
                      </div>
                      <p className="mt-3 text-xs font-medium text-[#191A23]/70 border-t border-[#191A23]/10 pt-2">Espectadores nos segundos iniciais</p>
                    </article>

                    <article 
                      onClick={() => setActivePanel({ type: "retention-pitch", title: "Retenção no Pitch (75%)", data: { pitch: pitchRetention } })}
                      className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[3px_3px_0px_#191A23] cursor-pointer hover:bg-[#B9FF66]/20 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#191A23]/70">Retenção no Pitch (75%)</p>
                        <strong className="mt-2 block text-3xl font-black text-[#191A23]">{format(pitchRetention, true)}</strong>
                      </div>
                      <p className="mt-3 text-xs font-medium text-[#191A23]/70 border-t border-[#191A23]/10 pt-2">Pessoas ativas na hora da oferta</p>
                    </article>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FUNIL */}
            {tab === "funnel" && (
              <section className="w-full max-w-[880px] rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23]">
                <div className="mb-6">
                  <h2 className="text-lg font-black text-[#191A23]">Funil de Conversão da VSL</h2>
                  <p className="text-xs font-medium text-[#191A23]/70">Perda de público e taxas de conversão relativas a cada etapa.</p>
                </div>

                <div className="w-full py-2">
                  <FunnelChart data={funnelChartData} layers={3} />
                </div>
              </section>
            )}

            {/* TAB 4: MAPA DE CALOR */}
            {tab === "heatmap" && (
              <section className="w-full max-w-[760px] rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23]">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-[#191A23]">Mapa de Calor da VSL</h2>
                    <p className="text-xs font-medium text-[#191A23]/70">Intensidade por dia da semana.</p>
                  </div>
                  <div className="flex gap-1.5 rounded-full border-2 border-[#191A23] bg-white p-1">
                    {( [["plays", "Plays"], ["impressions", "Impressões"], ["conversions", "Conversões"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setHeatmapMetric(id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${heatmapMetric === id ? "bg-[#B9FF66] text-[#191A23] border border-[#191A23]" : "text-[#191A23]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {heatmapColumns.length ? (
                  <HeatmapInteractionProvider>
                    <HeatmapInteractionBoundary>
                      <div className="flex w-full flex-col items-stretch gap-3 overflow-x-auto">
                        <HeatmapChart
                          className="w-full"
                          data={heatmapColumns}
                          layout="fluid"
                          binSize={heatmapBinSize}
                          gap={HEATMAP_GAP}
                          colorScale={heatmapColorScale}
                          levelStyles={HEATMAP_DEFAULT_LEVEL_STYLES}
                        >
                          <HeatmapCells inactiveOpacity={1} inactiveScale={1} />
                          <HeatmapXAxis />
                          <HeatmapYAxis />
                          <HeatmapTooltip
                            instant
                            formatLabel={(count) => `${format(count)} ${heatmapMetricLabel[heatmapMetric](count)}`}
                          />
                        </HeatmapChart>
                        <HeatmapLegend
                          inactiveOpacity={1}
                          inactiveScale={1}
                          lessLabel="Menos"
                          moreLabel="Mais"
                          levelStyles={HEATMAP_DEFAULT_LEVEL_STYLES}
                        />
                      </div>
                    </HeatmapInteractionBoundary>
                  </HeatmapInteractionProvider>
                ) : (
                  <p className="py-16 text-center text-xs font-bold text-[#191A23]/60">Ainda não há dados suficientes no período selecionado.</p>
                )}
              </section>
            )}

            {/* TAB 5: PÚBLICO */}
            {tab === "audience" && (
              <div className="grid gap-6 md:grid-cols-2">
                <DimensionTable title="Países de Origem" rows={data.dimensions.countries} isCountry={true} onRowClick={(row) => setActivePanel({ type: "segment", title: row.name, subtitle: "Países", data: row })} />
                <DimensionTable title="Fontes de Tráfego" rows={data.dimensions.traffic} onRowClick={(row) => setActivePanel({ type: "segment", title: row.name, subtitle: "Fontes de Tráfego", data: row })} />
              </div>
            )}

            {/* TAB 6: TECNOLOGIA */}
            {tab === "technology" && (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-sm font-black uppercase text-[#191A23]">Dispositivos</h3>
                    <p className="text-xs font-medium text-[#191A23]/70 mt-0.5">Visitas segmentadas por hardware</p>
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
                      className="w-full xl:w-auto text-xs font-bold text-[#191A23]"
                    />
                  </div>
                </div>

                <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-sm font-black uppercase text-[#191A23]">Navegadores</h3>
                    <p className="text-xs font-medium text-[#191A23]/70 mt-0.5">Uso relativo de browsers</p>
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
                      className="w-full xl:w-auto text-xs font-bold text-[#191A23]"
                    />
                  </div>
                </div>

                <div className="rounded-[30px] border-2 border-[#191A23] bg-white p-6 shadow-[4px_4px_0px_#191A23] flex flex-col justify-between min-h-[360px]">
                  <div className="mb-4">
                    <h3 className="text-sm font-black uppercase text-[#191A23]">Sistemas Operacionais</h3>
                    <p className="text-xs font-medium text-[#191A23]/70 mt-0.5">Sistemas dos visitantes</p>
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
                      className="w-full xl:w-auto text-xs font-bold text-[#191A23]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: AO VIVO */}
            {tab === "live" && (
              <section className="overflow-hidden rounded-[30px] border-2 border-[#191A23] bg-white shadow-[4px_4px_0px_#191A23]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#191A23]/10 p-6 bg-[#F3F3F3]">
                  <div>
                    <h2 className="text-lg font-black text-[#191A23]">Tráfego ao Vivo</h2>
                    <p className="text-xs font-medium text-[#191A23]/70">Conexões em tempo real assistindo sua VSL neste instante.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#191A23] bg-[#B9FF66] px-3.5 py-1 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#191A23]" />
                    <span>{data.live} assistindo agora</span>
                  </div>
                </div>
                
                <div className="grid min-w-0 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="p-6 flex items-center justify-center border-b-2 lg:border-b-0 lg:border-r-2 border-[#191A23]/10 bg-white">
                    <StatCardChoropleth 
                      title="Geolocalização do Tráfego Real"
                      liveCountries={activeCountryRows} 
                      totalLive={data.live}
                    />
                  </div>
                  
                  <div className="max-h-[500px] min-w-0 overflow-y-auto p-6 divide-y border-[#191A23]/10 space-y-4">
                    <div className="pb-3 flex items-center justify-between border-b-2 border-[#191A23]/10">
                      <h3 className="font-black text-xs uppercase tracking-wider text-[#191A23]">Cidades/Países Ativos</h3>
                      <span className="text-[10px] font-bold text-[#191A23]/60">Últimos minutos</span>
                    </div>
                    
                    <div className="space-y-3 pt-3">
                      {(activeCountryRows.length ? activeCountryRows : [{ name: "Sem sessões ativas", impressions: 0, plays: 0, playRate: 0, completes: 0, completionRate: 0 }]).map((row) => (
                        <div 
                          key={row.name} 
                          onClick={() => row.impressions > 0 && setActivePanel({ type: "live-session", title: row.name, data: row })}
                          className={`grid grid-cols-[1fr_96px_60px] items-center gap-3 text-xs font-bold ${
                            row.impressions > 0 ? "cursor-pointer hover:text-[#191A23]" : ""
                          }`}
                        >
                          <span className="truncate font-bold text-[#191A23] flex items-center gap-2">
                            {row.impressions > 0 && row.name !== "Sem sessões ativas" && (
                              <img
                                alt=""
                                className="h-3 w-4 shrink-0 rounded object-cover border border-[#191A23]"
                                height={12}
                                src={flagUrl(row.name)}
                                width={16}
                              />
                            )}
                            {row.impressions > 0 && row.name !== "Sem sessões ativas" ? getCountryName(row.name) : row.name}
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full border border-[#191A23] bg-[#F3F3F3]">
                            <span className="block h-full rounded-full bg-[#B9FF66]" style={{ width: `${Math.max(row.impressions ? 4 : 0, (row.impressions / maxRealValue) * 100)}%` }} />
                          </span>
                          <strong className="text-right font-black text-[#191A23]">{format(row.impressions)}</strong>
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

      {/* Ask IA Drawer */}
      <div className={`fixed inset-0 z-40 bg-[#191A23]/30 backdrop-blur-sm transition-opacity duration-300 ${aiOpen ? "pointer-events-auto opacity-100 xl:pointer-events-none xl:opacity-0" : "pointer-events-none opacity-0"}`} onClick={() => setAiOpen(false)} />
      
      <aside className={`fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l-2 border-[#191A23] bg-white transition-[transform,max-width] duration-300 shadow-2xl ${aiFullscreen ? "max-w-none" : "max-w-[480px]"} ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex min-h-16 items-center justify-between border-b-2 border-[#191A23] px-6 bg-[#F3F3F3]">
          <div>
            <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#191A23]">Prisma IA</span>
            <h2 className="text-base font-black text-[#191A23]">Análise Inteligente</h2>
          </div>
          <div className="relative flex items-center gap-2">
            <button onClick={() => setAiHistoryOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#191A23] bg-white text-[#191A23] hover:bg-[#B9FF66]/20 cursor-pointer" aria-label="Histórico">
              <History size={16} />
            </button>
            <button onClick={() => setAiFullscreen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#191A23] bg-white text-[#191A23] hover:bg-[#B9FF66]/20 cursor-pointer" aria-label="Tela cheia">
              {aiFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={() => setAiOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#191A23] bg-white text-[#191A23] hover:bg-red-100 hover:text-red-600 cursor-pointer" aria-label="Fechar">
              <X size={16} />
            </button>

            {aiHistoryOpen && (
              <div className="absolute right-0 top-12 z-20 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border-2 border-[#191A23] bg-white p-3 shadow-[4px_4px_0px_#191A23]">
                <div className="flex items-center justify-between px-3 py-2 border-b-2 border-[#191A23]/10 mb-2">
                  <strong className="text-xs font-black text-[#191A23]">Histórico de Análises</strong>
                  <span className="text-[10px] font-bold text-[#191A23]/70">{aiConversations.length} conversas</span>
                </div>
                <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
                  {aiConversations.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs font-bold text-[#191A23]/60">Suas análises aparecerão aqui.</p>
                  ) : (
                    aiConversations.map((conversation) => (
                      <button 
                        key={conversation.id} 
                        type="button" 
                        onClick={() => { setAiQuestion(conversation.question); setAiResult(conversation.result); setAiHistoryOpen(false); }} 
                        className="block w-full rounded-xl p-2.5 text-left hover:bg-[#B9FF66]/20 cursor-pointer transition-colors border border-transparent hover:border-[#191A23]"
                      >
                        <span className="block truncate text-xs font-black text-[#191A23]">{conversation.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium text-[#191A23]/70">{conversation.question}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F3F3F3] p-5 space-y-4">
          <div className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[3px_3px_0px_#191A23] space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#191A23]">Como posso otimizar sua VSL?</h3>
                <p className="text-xs font-medium text-[#191A23]/70">Consulte recomendações baseadas no tráfego real.</p>
              </div>
            </div>
            <div className="grid gap-2 pt-1">
              {suggestionPrompts.map((prompt) => (
                <button 
                  key={prompt} 
                  onClick={() => void askAi(prompt)} 
                  className="rounded-xl border-2 border-[#191A23] bg-white px-3.5 py-2.5 text-left text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]/20 transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {aiError && <p className="rounded-2xl border-2 border-[#191A23] bg-red-100 p-4 text-xs font-bold text-red-900 shadow-[2px_2px_0px_#191A23]">{aiError}</p>}

          {aiResult && (
            <div className="space-y-4 font-sans">
              <article className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[3px_3px_0px_#191A23]">
                <h3 className="text-sm font-black text-[#191A23] flex items-center gap-2">
                  <Sparkles size={16} /> {aiResult.headline}
                </h3>
                <p className="mt-2 text-xs font-medium text-[#191A23]/80 leading-relaxed">{aiResult.executiveSummary}</p>
              </article>

              {aiResult.warnings.length > 0 && (
                <div className="rounded-2xl border-2 border-[#191A23] bg-amber-100 p-5 shadow-[3px_3px_0px_#191A23]">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider mb-2">Pontos de Atenção</h4>
                  <ul className="list-disc pl-4 text-xs font-bold text-amber-900 space-y-1">
                    {aiResult.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#191A23] uppercase tracking-wider">Oportunidades Recomendadas</h4>
                {aiResult.opportunities.map((op, index) => (
                  <article key={index} className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[3px_3px_0px_#191A23] space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xs font-black text-[#191A23]">{op.title}</strong>
                      <span className="rounded-full border border-[#191A23] bg-[#B9FF66] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#191A23]">
                        {op.priority}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#191A23]/80 space-y-2">
                      <p><b>Evidência:</b> {op.evidence}</p>
                      <p className="border-t border-[#191A23]/10 pt-2 font-bold text-[#191A23]"><b>Ação sugerida:</b> {op.action}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="animate-spin text-[#191A23]" size={24} />
            </div>
          )}
        </div>

        <div className="border-t-2 border-[#191A23] bg-white p-4">
          <ClaudeChatInput
            onSendMessage={(data) => void askAi(data.message)}
            isLoading={aiLoading}
          />
        </div>
      </aside>
    </div>
  );
}
