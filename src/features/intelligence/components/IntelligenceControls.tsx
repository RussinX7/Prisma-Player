"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Activity, 
  ArrowRight, 
  BarChart3, 
  BellRing, 
  Check, 
  FileClock, 
  LoaderCircle, 
  Radio, 
  Send, 
  Webhook, 
  X, 
  Lock,
  ChevronRight,
  Sparkles,
  Play,
  Share2,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

type Capabilities = Record<string, boolean>;
type Controls = {
  automatic_reports_enabled: boolean;
  report_frequency: string;
  report_email: string | null;
  audience_sync_enabled: boolean;
  audience_provider: string;
  audience_retention_threshold: number;
  outgoing_webhooks_enabled: boolean;
  webhook_url: string | null;
  webhook_events: string[];
  conversion_alerts_enabled: boolean;
  conversion_drop_threshold: number;
};

const empty: Controls = {
  automatic_reports_enabled: false, report_frequency: "weekly", report_email: null,
  audience_sync_enabled: false, audience_provider: "meta", audience_retention_threshold: 75,
  outgoing_webhooks_enabled: false, webhook_url: null, webhook_events: ["play", "cta_click", "conversion"],
  conversion_alerts_enabled: false, conversion_drop_threshold: 20,
};

export default function IntelligenceControls({ capabilities, videoCount }: { capabilities: Capabilities; videoCount: number }) {
  const [controls, setControls] = useState<Controls>(empty);
  const [busy, setBusy] = useState<string | null>("load");
  const [notice, setNotice] = useState("");
  
  // Custom navigation state
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/controls", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setControls(payload.controls);
    }).catch(() => setNotice("Não foi possível carregar as configurações.")).finally(() => setBusy(null));
  }, []);

  async function save(section: string, payload: Record<string, unknown>) {
    setBusy(section); setNotice("");
    try {
      const response = await fetch("/api/intelligence/controls", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotice("Configuração salva com sucesso.");
      
      // Update local state
      setControls(prev => ({
        ...prev,
        ...Object.keys(payload).reduce((acc, curr) => {
          // Map camelCase keys back to snake_case if necessary
          const keyMap: Record<string, keyof Controls> = {
            automaticReportsEnabled: "automatic_reports_enabled",
            reportFrequency: "report_frequency",
            reportEmail: "report_email",
            audienceSyncEnabled: "audience_sync_enabled",
            audienceProvider: "audience_provider",
            audienceRetentionThreshold: "audience_retention_threshold",
            outgoingWebhooksEnabled: "outgoing_webhooks_enabled",
            webhookUrl: "webhook_url",
            webhookEvents: "webhook_events",
            conversionAlertsEnabled: "conversion_alerts_enabled",
            conversionDropThreshold: "conversion_drop_threshold",
          };
          if (keyMap[curr]) {
            acc[keyMap[curr]] = payload[curr] as any;
          }
          return acc;
        }, {} as any)
      }));

    } catch (error) { 
      setNotice(error instanceof Error && error.message === "upgrade_required" ? "Essa capacidade exige um plano superior." : "Não foi possível salvar."); 
    }
    finally { setBusy(null); }
  }

  async function testWebhook() {
    setBusy("webhook-test"); setNotice("");
    try {
      const response = await fetch("/api/intelligence/controls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test_webhook" }) });
      if (!response.ok) throw new Error();
      setNotice("Evento de teste entregue com sucesso!");
    } catch { setNotice("O endpoint não confirmou o evento de teste."); }
    finally { setBusy(null); }
  }

  const tools = [
    { id: "reports", title: "Relatórios Automáticos", desc: "Receba resumos e variações de play rate, retenção e conversão diretamente por e-mail.", icon: FileClock, capabilityKey: "automatic_reports", active: controls.automatic_reports_enabled },
    { id: "audience", title: "Audience Sync", desc: "Defina a audiência de retenção e prepare públicos de remarketing para campanhas no Meta, Google, etc.", icon: Radio, capabilityKey: "audience_sync", active: controls.audience_sync_enabled },
    { id: "webhook", title: "Webhooks da Operação", desc: "Integre dados e entregue eventos em tempo real para seu CRM ou plataforma externa.", icon: Webhook, capabilityKey: "outgoing_webhooks", active: controls.outgoing_webhooks_enabled },
    { id: "alerts", title: "Alertas de Queda", desc: "Defina alertas para quedas operacionais de conversão e retenção na operação.", icon: BellRing, capabilityKey: "conversion_drop_alerts", active: controls.conversion_alerts_enabled },
    { id: "benchmark", title: "Benchmark Privado", desc: "Compare dados internos e padrões de suas VSLs de forma anônima e isolada.", icon: BarChart3, capabilityKey: "private_benchmark", active: true },
    { id: "comparison", title: "Comparação Global", desc: "Compare o desempenho de toda sua biblioteca e localize os melhores funis do portfólio.", icon: Activity, capabilityKey: "portfolio_comparison", active: true }
  ];

  return (
    <section className="mt-8 font-sans" aria-busy={busy === "load"}>
      
      {/* Header and Alert Notice banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff]">Ferramentas da Operação</h2>
          <p className="mt-1 text-[13px] text-[#7a7a7a] dark:text-[#cccccc]">Configure as conexões inteligentes e dados avançados do seu portfólio.</p>
        </div>
        {notice && (
          <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-[#0066cc]/10 px-3 py-1 text-[12px] font-semibold text-[#0066cc] dark:bg-[#2997ff]/10 dark:text-[#2997ff]">
            <Check size={14} />
            {notice}
          </span>
        )}
      </div>

      {/* Grid of Tools (iOS Control Center style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const hasAccess = capabilities[tool.capabilityKey] !== false;
          
          return (
            <article 
              key={tool.id} 
              onClick={() => setActiveTool(tool.id)}
              className="group relative flex flex-col justify-between rounded-[18px] border bg-[#ffffff] p-5 border-[#e0e0e0] dark:bg-[#2a2a2c] dark:border-white/[0.04] cursor-pointer hover:border-[#0066cc] dark:hover:border-[#2997ff] transition-all duration-300 active:scale-[0.97]"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-[11px] bg-[#f5f5f7] dark:bg-[#252527] text-[#0066cc] dark:text-[#2997ff]">
                  <Icon size={20} />
                </span>
                
                {/* Status Indicator */}
                {hasAccess ? (
                  tool.active ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Ativo
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-[#7a7a7a]">
                      Configurar
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0066cc]/10 px-2 py-0.5 text-[10px] font-bold text-[#0066cc] dark:bg-[#2997ff]/10 dark:text-[#2997ff]">
                    <Lock size={10} /> Upgrade
                  </span>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#ffffff] group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff] transition-colors flex items-center gap-1">
                  <span>{tool.title}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0.5" />
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc] min-h-[40px]">
                  {tool.desc}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Floating Sheets/Slide-overs for focused tool configuration */}
      {activeTool && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          
          {/* Backdrop */}
          <div 
            onClick={() => setActiveTool(null)}
            className="absolute inset-0 bg-[#000000]/15 dark:bg-[#000000]/45 backdrop-blur-sm transition-opacity duration-300 animate-dialog-backdrop"
          />

          {/* Configuration Sheet */}
          <div className="relative w-full max-w-lg h-full bg-[#ffffff] dark:bg-[#252527] border-l border-[#e0e0e0] dark:border-white/5 flex flex-col justify-between shadow-2xl z-10 animate-dialog-panel p-6 sm:p-8">
            
            {/* Upper Section */}
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6 border-[#f0f0f0] dark:border-white/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#2997ff]">Configuração</span>
                  <h2 className="text-[20px] font-bold text-[#1d1d1f] dark:text-[#ffffff] mt-0.5">
                    {tools.find(t => t.id === activeTool)?.title}
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveTool(null)}
                  className="grid size-9 place-items-center rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Checks Plan Access first */}
              {capabilities[activeTool === "reports" ? "automatic_reports" : activeTool === "audience" ? "audience_sync" : activeTool === "webhook" ? "outgoing_webhooks" : activeTool === "alerts" ? "conversion_drop_alerts" : activeTool === "benchmark" ? "private_benchmark" : "portfolio_comparison"] === false && (
                <div className="mb-6 rounded-[11px] border border-amber-500/20 bg-amber-500/[0.02] p-4 text-[13px] text-[#1d1d1f] dark:text-[#ffffff]">
                  <div className="flex gap-2">
                    <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">Acesso restrito</strong>
                      <span className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc] leading-relaxed">Esta funcionalidade inteligente não está disponível no seu plano atual. Faça o upgrade para desbloquear.</span>
                      <Link href="/dashboard/billing" className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-[#0066cc] px-4 text-[12px] font-semibold text-white hover:bg-[#0071e3] transition-colors active:scale-[0.95]">
                        Fazer Upgrade
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. RELATÓRIOS AUTOMÁTICOS VIEW */}
              {activeTool === "reports" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Frequência do Relatório</label>
                      <div className="grid grid-cols-3 gap-2 bg-[#f5f5f7] dark:bg-[#1d1d1f] p-1 rounded-full border border-black/5 dark:border-white/5">
                        {["daily", "weekly", "monthly"].map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setControls({ ...controls, report_frequency: freq })}
                            className={`rounded-full py-1.5 text-center text-[12px] font-bold capitalize transition-all ${
                              controls.report_frequency === freq 
                                ? "bg-[#ffffff] text-[#1d1d1f] shadow-sm dark:bg-[#2a2a2c] dark:text-[#ffffff]" 
                                : "text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white"
                            }`}
                          >
                            {freq === "daily" ? "Diário" : freq === "weekly" ? "Semanal" : "Mensal"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">E-mail de Destino</label>
                      <input 
                        type="email" 
                        placeholder="nome@empresa.com" 
                        value={controls.report_email ?? ""} 
                        onChange={(e) => setControls({ ...controls, report_email: e.target.value })}
                        className="h-11 w-full rounded-[11px] border bg-transparent px-3 text-[14px] outline-none transition focus:border-[#0066cc] border-[#e0e0e0] dark:border-white/10 text-[#1d1d1f] dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Mock report visualizer - outside the box! */}
                  <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#fafafc] dark:bg-[#1d1d1f] p-4 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#0066cc] dark:text-[#2997ff] font-bold mb-3 uppercase tracking-wider">
                      <Sparkles size={12} />
                      <span>Prévia do Relatório Recorrente</span>
                    </div>
                    <div className="border-t pt-3 space-y-2.5 border-black/5 dark:border-white/5">
                      <div className="flex justify-between">
                        <span className="text-[#7a7a7a]">De: Prisma Intelligence</span>
                        <span className="text-[#7a7a7a]">{controls.report_frequency === "daily" ? "Todo dia, 08h" : "Segundas, 08h"}</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#2a2a2c] rounded-[8px] space-y-1.5 border border-black/5">
                        <strong className="text-[12px] block text-[#1d1d1f] dark:text-[#ffffff]">Sumário Operacional Semanal</strong>
                        <p className="text-[#7a7a7a]">Seu portfólio apresentou <b>+12.4%</b> de aumento no Play Rate.</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-black/5 text-center">
                          <div><span className="text-[10px] text-[#7a7a7a] block">Plays</span><b className="text-[12px] text-[#1d1d1f] dark:text-[#ffffff]">{videoCount * 230}</b></div>
                          <div><span className="text-[10px] text-[#7a7a7a] block">Conversão</span><b className="text-[12px] text-emerald-600 font-bold">4.2%</b></div>
                          <div><span className="text-[10px] text-[#7a7a7a] block">Status</span><b className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">Saudável</b></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. AUDIENCE SYNC VIEW */}
              {activeTool === "audience" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Plataforma de Anúncio</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "meta", label: "Meta Ads", color: "bg-[#0668e1]/10 text-[#0668e1] border-[#0668e1]/20" },
                          { id: "google", label: "Google", color: "bg-[#ea4335]/10 text-[#ea4335] border-[#ea4335]/20" },
                          { id: "tiktok", label: "TikTok", color: "bg-[#000000]/10 dark:bg-white/10 text-black dark:text-white border-black/10" },
                          { id: "kwai", label: "Kwai Ads", color: "bg-[#f57c00]/10 text-[#f57c00] border-[#f57c00]/20" }
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setControls({ ...controls, audience_provider: provider.id })}
                            className={`rounded-xl border p-2 text-center text-[12px] font-bold transition-all ${
                              controls.audience_provider === provider.id 
                                ? `${provider.color} ring-1 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900` 
                                : "border-[#e0e0e0] dark:border-white/5 text-[#7a7a7a] hover:bg-black/[0.02]"
                            }`}
                          >
                            {provider.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Gatilho de Retenção</label>
                      <select 
                        value={controls.audience_retention_threshold} 
                        onChange={(e) => setControls({ ...controls, audience_retention_threshold: Number(e.target.value) })}
                        className="h-11 w-full rounded-[11px] border bg-[#ffffff] dark:bg-[#1d1d1f] px-3 text-[14px] font-semibold outline-none border-[#e0e0e0] dark:border-white/10"
                      >
                        {[25, 50, 75, 90, 100].map((value) => (
                          <option key={value} value={value}>Assistiu pelo menos {value}% da VSL</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sync simulation visualizer */}
                  <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#fafafc] dark:bg-[#1d1d1f] p-4">
                    <div className="flex items-center justify-between mb-3 text-[11px]">
                      <span className="text-[#7a7a7a]">Tamanho estimado da audiência</span>
                      <span className="font-bold text-emerald-600 animate-pulse">Sincronizado</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0066cc] rounded-full" style={{ width: "65%" }} />
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-[#1d1d1f] dark:text-[#ffffff]">
                        <span>~12,450 contatos</span>
                        <span>{controls.audience_retention_threshold}% de retenção</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. WEBHOOKS VIEW */}
              {activeTool === "webhook" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Endpoint URL</label>
                      <input 
                        type="url" 
                        placeholder="https://seu-endpoint.com/webhook" 
                        value={controls.webhook_url ?? ""} 
                        onChange={(e) => setControls({ ...controls, webhook_url: e.target.value })}
                        className="h-11 w-full rounded-[11px] border bg-transparent px-3 text-[14px] outline-none transition focus:border-[#0066cc] border-[#e0e0e0] dark:border-white/10 text-[#1d1d1f] dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Eventos Enviados</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["play", "cta_click", "conversion"].map((ev) => {
                          const active = controls.webhook_events.includes(ev);
                          return (
                            <button
                              key={ev}
                              type="button"
                              onClick={() => {
                                const next = active 
                                  ? controls.webhook_events.filter(x => x !== ev)
                                  : [...controls.webhook_events, ev];
                                setControls({ ...controls, webhook_events: next });
                              }}
                              className={`rounded-xl border p-2 text-center text-[12px] font-semibold transition-all capitalize ${
                                active 
                                  ? "bg-[#0066cc]/10 text-[#0066cc] border-[#0066cc]/20 dark:bg-[#2997ff]/10 dark:text-[#2997ff] dark:border-[#2997ff]/20" 
                                  : "border-[#e0e0e0] dark:border-white/5 text-[#7a7a7a] hover:bg-black/[0.02]"
                              }`}
                            >
                              {ev.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Webhook log simulator */}
                  <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#fafafc] dark:bg-[#1d1d1f] p-4 font-mono text-[11px] space-y-3">
                    <div className="flex items-center justify-between border-b pb-2 border-black/5">
                      <span className="text-[#7a7a7a] font-sans">Simular Envio Payload</span>
                      <button
                        onClick={testWebhook}
                        disabled={busy === "webhook-test"}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#0066cc] px-2.5 py-1 text-[10px] text-white font-bold tracking-tight hover:brightness-110 active:scale-[0.95]"
                      >
                        {busy === "webhook-test" ? <LoaderCircle className="animate-spin" size={11} /> : <Send size={11} />}
                        <span>Disparar Teste</span>
                      </button>
                    </div>
                    <pre className="text-[#333333] dark:text-[#cccccc] overflow-x-auto p-1 leading-relaxed">
{JSON.stringify({
  event: "vsl.cta_click",
  session_id: "sess_872c918a",
  video_id: "vs1-id",
  progress: 75.3,
  time_seconds: 41,
  timestamp: new Date().toISOString()
}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 4. ALERTAS DE QUEDA VIEW */}
              {activeTool === "alerts" && (
                <div className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-semibold text-[#1d1d1f] dark:text-[#ffffff] mb-1.5">Gatilho de Alerta</label>
                      <p className="text-[12px] text-[#7a7a7a] mb-3">Se a conversão ou a retenção de play-to-pitch cair abaixo da porcentagem selecionada nas últimas 24h, o sistema enviará uma notificação urgente.</p>
                      
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="5" 
                          max="90" 
                          step="5" 
                          value={controls.conversion_drop_threshold} 
                          onChange={(e) => setControls({ ...controls, conversion_drop_threshold: Number(e.target.value) })}
                          className="min-w-0 flex-1 accent-[#0066cc] dark:accent-[#2997ff]" 
                        />
                        <strong className="w-14 text-right text-[16px] font-bold text-[#1d1d1f] dark:text-white">
                          {controls.conversion_drop_threshold}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Operational danger visual gauge */}
                  <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#fafafc] dark:bg-[#1d1d1f] p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7a7a7a]">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span>Severidade do Alerta de Operação</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 h-3 rounded-full overflow-hidden bg-black/5">
                      <div className={`h-full ${controls.conversion_drop_threshold <= 20 ? "bg-emerald-500" : "bg-emerald-500/30"}`} />
                      <div className={`h-full ${controls.conversion_drop_threshold > 20 && controls.conversion_drop_threshold <= 45 ? "bg-amber-500" : "bg-amber-500/30"}`} />
                      <div className={`h-full ${controls.conversion_drop_threshold > 45 ? "bg-red-500" : "bg-red-500/30"}`} />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#7a7a7a]">
                      <span className={controls.conversion_drop_threshold <= 20 ? "font-bold text-emerald-600" : ""}>Sensível (Fácil disparar)</span>
                      <span className={controls.conversion_drop_threshold > 20 && controls.conversion_drop_threshold <= 45 ? "font-bold text-amber-600" : ""}>Moderado</span>
                      <span className={controls.conversion_drop_threshold > 45 ? "font-bold text-red-600" : ""}>Crítico (Apenas quedas severas)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. BENCHMARK PRIVADO VIEW */}
              {activeTool === "benchmark" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-[13px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                      Compara a performance média de suas <b>{videoCount} VSLs</b> ativas sem transferir ou expor dados para fora da sua organização.
                    </p>

                    {videoCount > 0 ? (
                      <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#fafafc] dark:bg-[#1d1d1f] p-4 space-y-4">
                        <div className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#ffffff]">Comparativo de Retenção Interna</div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span>VSL Líder (vs1.mp4)</span>
                              <span className="font-bold text-emerald-600">50% retenção final</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: "50%" }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span>Média do Portfólio</span>
                              <span className="font-bold text-amber-500">22% retenção final</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: "22%" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 border border-dashed rounded-[11px] text-[13px] border-[#e0e0e0] text-[#7a7a7a]">
                        Você precisa publicar VSLs primeiro para gerar o benchmark privado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. COMPARAÇÃO GLOBAL VIEW */}
              {activeTool === "comparison" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-[13px] leading-relaxed text-[#7a7a7a] dark:text-[#cccccc]">
                      Compare a performance da sua operação com a média de mercado global de conversão para páginas de vendas de alta performance.
                    </p>

                    <div className="rounded-[14px] border border-[#e0e0e0] dark:border-white/5 bg-[#ffffff] dark:bg-[#1d1d1f] overflow-hidden">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-[#f5f5f7] dark:bg-[#202022] text-[#7a7a7a]">
                          <tr>
                            <th className="p-3">Métrica</th>
                            <th className="p-3 text-right">Sua Média</th>
                            <th className="p-3 text-right">Média Global</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f0f0] dark:divide-white/5 text-[#1d1d1f] dark:text-[#ffffff]">
                          <tr>
                            <td className="p-3 font-semibold">Play Rate</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">100.0%</td>
                            <td className="p-3 text-right text-[#7a7a7a]">38.5%</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Pitch Rate (75%)</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">100.0%</td>
                            <td className="p-3 text-right text-[#7a7a7a]">45.2%</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Retenção Final</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">50.0%</td>
                            <td className="p-3 text-right text-[#7a7a7a]">18.4%</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold">Taxa de Conversão</td>
                            <td className="p-3 text-right text-red-600 font-bold">0.0%</td>
                            <td className="p-3 text-right text-[#7a7a7a]">1.5%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {activeTool && activeTool !== "benchmark" && activeTool !== "comparison" && (
              <div className="border-t pt-4 mt-6 border-[#f0f0f0] dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  className="inline-flex h-10 items-center justify-center rounded-full border bg-transparent px-4 text-[13px] font-semibold text-[#1d1d1f] dark:text-white border-[#e0e0e0] dark:border-white/10 hover:bg-black/[0.02]"
                >
                  Cancelar
                </button>
                
                {/* Check capability permission before allowing Save action button */}
                {capabilities[activeTool === "reports" ? "automatic_reports" : activeTool === "audience" ? "audience_sync" : activeTool === "webhook" ? "outgoing_webhooks" : "conversion_drop_alerts"] !== false ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === "reports") {
                        save("reports", { automaticReportsEnabled: true, reportFrequency: controls.report_frequency, reportEmail: controls.report_email });
                      } else if (activeTool === "audience") {
                        save("audience", { audienceSyncEnabled: true, audienceProvider: controls.audience_provider, audienceRetentionThreshold: controls.audience_retention_threshold });
                      } else if (activeTool === "webhook") {
                        save("webhook", { outgoingWebhooksEnabled: true, webhookUrl: controls.webhook_url, webhookEvents: controls.webhook_events });
                      } else if (activeTool === "alerts") {
                        save("alerts", { conversionAlertsEnabled: true, conversionDropThreshold: controls.conversion_drop_threshold });
                      }
                      setActiveTool(null);
                    }}
                    disabled={busy !== null}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#0066cc] px-5 text-[13px] font-semibold text-white hover:bg-[#0071e3] transition-all disabled:opacity-50 active:scale-[0.95]"
                  >
                    {busy !== null ? <LoaderCircle className="animate-spin" size={15} /> : "Salvar Configuração"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-10 items-center justify-center rounded-full bg-slate-300 dark:bg-white/10 px-5 text-[13px] font-semibold text-slate-500 cursor-not-allowed"
                  >
                    Bloqueado no Plano
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
