"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, BellRing, Check, FileClock, LoaderCircle, Radio, Send, Webhook } from "lucide-react";

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
      setNotice("Configuração salva.");
    } catch (error) { setNotice(error instanceof Error && error.message === "upgrade_required" ? "Essa capacidade exige um plano superior." : "Não foi possível salvar."); }
    finally { setBusy(null); }
  }

  async function testWebhook() {
    setBusy("webhook-test"); setNotice("");
    try {
      const response = await fetch("/api/intelligence/controls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test_webhook" }) });
      if (!response.ok) throw new Error();
      setNotice("Evento de teste entregue com sucesso.");
    } catch { setNotice("O endpoint não confirmou o evento de teste."); }
    finally { setBusy(null); }
  }

  const field = "h-10 w-full rounded-[11px] border bg-transparent px-3 text-[13px] outline-none transition focus:border-[#0066cc] themeable-border-hairline themeable-text-ink";
  return <section className="mt-5" aria-busy={busy === "load"}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-[21px] font-semibold tracking-[-.02em] themeable-text-ink">Ferramentas da operação</h2><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Configure apenas o que sua equipe realmente usa.</p></div>
      {notice && <span role="status" className="inline-flex items-center gap-1.5 text-[12px] text-[#0066cc]"><Check size={14} />{notice}</span>}
    </div>
    <div className="grid gap-px overflow-hidden rounded-[18px] border bg-[#e0e0e0] themeable-border-hairline lg:grid-cols-2">
      <Control title="Relatórios automáticos" description="Receba um resumo recorrente com variações de play rate, retenção e conversão." icon={FileClock} available={capabilities.automatic_reports}>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select className={field} value={controls.report_frequency} onChange={(e) => setControls({ ...controls, report_frequency: e.target.value })}><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select><input className={field} type="email" placeholder="E-mail do relatório" value={controls.report_email ?? ""} onChange={(e) => setControls({ ...controls, report_email: e.target.value })} /><Action busy={busy === "reports"} onClick={() => save("reports", { automaticReportsEnabled: true, reportFrequency: controls.report_frequency, reportEmail: controls.report_email })}>Salvar</Action></div>
      </Control>
      <Control title="Audience Sync" description="Defina a audiência de retenção que será preparada para suas campanhas de remarketing." icon={Radio} available={capabilities.audience_sync}>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select className={field} value={controls.audience_provider} onChange={(e) => setControls({ ...controls, audience_provider: e.target.value })}><option value="meta">Meta</option><option value="google">Google</option><option value="tiktok">TikTok</option><option value="kwai">Kwai</option></select><select className={field} value={controls.audience_retention_threshold} onChange={(e) => setControls({ ...controls, audience_retention_threshold: Number(e.target.value) })}>{[25,50,75,90,100].map((value) => <option key={value} value={value}>Assistiu {value}%</option>)}</select><Action busy={busy === "audience"} onClick={() => save("audience", { audienceSyncEnabled: true, audienceProvider: controls.audience_provider, audienceRetentionThreshold: controls.audience_retention_threshold })}>Salvar</Action></div>
      </Control>
      <Control title="Webhooks" description="Entregue eventos da VSL ao seu CRM ou automação e valide o endpoint antes de publicar." icon={Webhook} available={capabilities.outgoing_webhooks}>
        <div className="flex gap-2"><input className={field} type="url" placeholder="https://seu-endpoint.com/webhook" value={controls.webhook_url ?? ""} onChange={(e) => setControls({ ...controls, webhook_url: e.target.value })} /><Action busy={busy === "webhook"} onClick={async () => { await save("webhook", { outgoingWebhooksEnabled: true, webhookUrl: controls.webhook_url, webhookEvents: controls.webhook_events }); }}>Salvar</Action><button type="button" onClick={testWebhook} className="grid size-10 shrink-0 place-items-center rounded-full border themeable-border-hairline themeable-text-ink" aria-label="Testar webhook">{busy === "webhook-test" ? <LoaderCircle className="animate-spin" size={15} /> : <Send size={15} />}</button></div>
      </Control>
      <Control title="Alertas de queda" description="Escolha a queda mínima de conversão que deve virar um alerta operacional." icon={BellRing} available={capabilities.conversion_drop_alerts}>
        <div className="flex items-center gap-3"><input className="min-w-0 flex-1 accent-[#0066cc]" type="range" min="5" max="90" step="5" value={controls.conversion_drop_threshold} onChange={(e) => setControls({ ...controls, conversion_drop_threshold: Number(e.target.value) })} /><strong className="w-12 text-right text-[14px] themeable-text-ink">{controls.conversion_drop_threshold}%</strong><Action busy={busy === "alerts"} onClick={() => save("alerts", { conversionAlertsEnabled: true, conversionDropThreshold: controls.conversion_drop_threshold })}>Salvar</Action></div>
      </Control>
      <Control title="Benchmark privado" description={`Compare padrões de ${videoCount} VSL${videoCount === 1 ? "" : "s"} sem compartilhar dados com outras operações.`} icon={BarChart3} available={capabilities.private_benchmark}><a href="#portfolio" className="inline-flex items-center gap-1 text-[13px] text-[#0066cc]">Abrir benchmark <ArrowRight size={14} /></a></Control>
      <Control title="Comparação global" description="Ordene toda a biblioteca por play rate, chegada ao pitch, retenção e conversão." icon={Activity} available={capabilities.portfolio_comparison}><a href="#portfolio" className="inline-flex items-center gap-1 text-[13px] text-[#0066cc]">Comparar VSLs <ArrowRight size={14} /></a></Control>
    </div>
  </section>;
}

function Control({ title, description, icon: Icon, available, children }: { title: string; description: string; icon: typeof Activity; available: boolean; children: React.ReactNode }) {
  return <article className="min-h-[190px] bg-white p-5 dark:bg-[#1d1d1f]"><div className="flex items-start justify-between gap-4"><span className="grid size-10 place-items-center rounded-[11px] bg-[#f5f5f7] text-[#0066cc] dark:bg-white/10"><Icon size={18} /></span>{!available && <Link href="/dashboard/billing" className="rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[11px] text-[#0066cc] dark:bg-white/10">Ver plano</Link>}</div><h3 className="mt-4 text-[17px] font-semibold tracking-[-.01em] themeable-text-ink">{title}</h3><p className="mt-1 min-h-10 text-[12px] leading-5 themeable-text-ink-muted-48">{description}</p><div className={`mt-4 ${available ? "" : "pointer-events-none opacity-35"}`}>{children}</div></article>;
}

function Action({ children, busy, onClick }: { children: React.ReactNode; busy: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} disabled={busy} className="h-10 shrink-0 rounded-full bg-[#0066cc] px-4 text-[12px] font-medium text-white disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={15} /> : children}</button>; }
