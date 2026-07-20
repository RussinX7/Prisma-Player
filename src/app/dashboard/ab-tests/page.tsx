"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Check, FlaskConical, FolderPlus, Plus, Search, Trash2 } from "lucide-react";
import Header from "@/components/dashboard/Header";
import Dialog from "@/components/ui/Dialog";

interface Metrics { impressions: number; plays: number; completed: number; reached75: number; playRate: number; completionRate: number; retention75: number }
interface Variant { id: string; video_id: string; weight: number; videos: { title: string } | { title: string }[] | null; metrics: Metrics }
interface Experiment { id: string; name: string; status: string; ab_test_variants: Variant[] }
interface TestFolder { id: string; name: string }
interface VideoItem { id: string; title: string; status: string }

export default function AbTestsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [query, setQuery] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [name, setName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [testsResponse, videosResponse] = await Promise.all([fetch("/api/ab-tests", { cache: "no-store" }), fetch("/api/videos", { cache: "no-store" })]);
    const [testsData, videosData] = await Promise.all([testsResponse.json(), videosResponse.json()]);
    if (testsResponse.ok) { setFolders(testsData.folders ?? []); setExperiments(testsData.tests ?? []); }
    if (videosResponse.ok) setVideos((videosData.videos ?? []).filter((video: VideoItem) => video.status === "ready"));
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visible = useMemo(() => experiments.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [experiments, query]);
  const videoTitle = (variant: Variant) => Array.isArray(variant.videos) ? variant.videos[0]?.title ?? "VSL" : variant.videos?.title ?? "VSL";

  async function createExperiment() {
    if (!name.trim() || selectedVideos.length < 2) return;
    setCreating(true);
    const response = await fetch("/api/ab-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "test", name: name.trim(), videoIds: selectedVideos }) });
    setCreating(false);
    if (response.ok) { setName(""); setSelectedVideos([]); setTestOpen(false); await load(); }
  }
  async function createFolder() { if (!folderName.trim()) return; const response = await fetch("/api/ab-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "folder", name: folderName.trim() }) }); if (response.ok) { setFolderName(""); setFolderOpen(false); await load(); } }
  async function removeTest(id: string) { if (!confirm("Excluir este teste e todas as métricas coletadas?")) return; const response = await fetch(`/api/ab-tests/${id}`, { method: "DELETE" }); if (response.ok) await load(); }
  async function copyEmbed(id: string) { const origin = window.location.origin; await navigator.clipboard.writeText(`<prisma-player data-prisma-player="${id}" data-mode="ab" data-title="Teste A/B Prisma" style="display:block;margin:0 auto;width:100%;position:relative;padding-top:56.25%;background:#000;overflow:hidden"></prisma-player>\n<script async src="${origin}/api/player-loader/${id}" data-prisma-loader="${id}"></script>`); setCopied(id); setTimeout(() => setCopied(null), 1600); }

  return <>
    <section className="dashboard-content flex flex-1 flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-prisma-blue/10 text-prisma-blue"><FlaskConical size={21} /></div><div><h2 className="text-[22px] font-semibold themeable-text-ink">Testes A/B de VSL</h2><p className="text-[13px] themeable-text-ink-muted-48">Cada visitante recebe uma variante estável e gera eventos reais</p></div></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setFolderOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[14px] themeable-border-hairline themeable-text-ink"><FolderPlus size={16} />Nova pasta</button><button type="button" onClick={() => setTestOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-prisma-blue px-4 text-[14px] text-white"><Plus size={16} />Novo teste</button></div></div>
      <div className="mt-6 flex min-h-[430px] flex-1 flex-col rounded-[18px] border themeable-bg-canvas themeable-border-hairline">
        {folders.length > 0 && <div className="flex gap-2 overflow-x-auto border-b p-4 themeable-border-hairline">{folders.map((folder) => <span key={folder.id} className="flex min-h-10 shrink-0 items-center gap-2 rounded-full themeable-bg-surface-pearl px-4 text-[13px] themeable-text-ink"><FolderPlus size={15} className="text-prisma-blue" />{folder.name}</span>)}</div>}
        <div className="flex border-b p-4 themeable-border-hairline sm:justify-end"><label className="flex min-h-11 w-full items-center gap-2 rounded-full border px-4 themeable-border-hairline sm:max-w-xs"><Search size={16} className="themeable-text-ink-muted-48" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar testes" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none themeable-text-ink" /></label></div>
        {visible.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"><FlaskConical size={34} className="themeable-text-ink-muted-48" /><h3 className="mt-5 text-[21px] font-semibold themeable-text-ink">Nenhum teste A/B ativo</h3><p className="mt-2 max-w-md text-[15px] themeable-text-ink-muted-48">Selecione pelo menos duas VSLs publicadas. As métricas começam zeradas e crescem somente com visitantes reais.</p><button type="button" onClick={() => setTestOpen(true)} className="mt-6 min-h-11 rounded-full bg-prisma-blue px-5 text-white">Criar primeiro teste</button></div> : <div className="divide-y themeable-border-hairline">{visible.map((test) => {
          const totals = test.ab_test_variants.reduce((sum, variant) => sum + variant.metrics.impressions, 0);
          return <article key={test.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-prisma-blue/10 text-prisma-blue"><BarChart3 size={20} /></div><button type="button" onClick={() => setExpanded(expanded === test.id ? null : test.id)} className="min-w-0 flex-1 text-left"><h3 className="truncate text-[16px] font-semibold themeable-text-ink">{test.name}</h3><p className="mt-1 text-[13px] themeable-text-ink-muted-48">{test.ab_test_variants.length} VSLs · {totals} impressões reais</p></button><span className="w-fit rounded-full bg-green-500/10 px-3 py-1 text-[12px] font-semibold text-green-600">Ativo</span><button type="button" onClick={() => void copyEmbed(test.id)} className="min-h-10 rounded-full border px-4 text-[13px] themeable-border-hairline themeable-text-ink">{copied === test.id ? "Embed copiado" : "Copiar embed A/B"}</button><button type="button" onClick={() => void removeTest(test.id)} className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button></div>{expanded === test.id && <div className="mt-5 grid gap-3 xl:grid-cols-2">{test.ab_test_variants.map((variant) => <div key={variant.id} className="rounded-[14px] border p-4 themeable-border-hairline"><div className="flex items-center justify-between gap-3"><h4 className="truncate font-semibold themeable-text-ink">{videoTitle(variant)}</h4><span className="text-[12px] themeable-text-ink-muted-48">Tráfego {variant.weight}%</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Impressões", variant.metrics.impressions], ["Play rate", `${variant.metrics.playRate.toFixed(1)}%`], ["Chegaram a 75%", `${variant.metrics.retention75.toFixed(1)}%`], ["Conclusão", `${variant.metrics.completionRate.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="rounded-[10px] themeable-bg-surface-pearl p-3"><p className="text-[11px] themeable-text-ink-muted-48">{label}</p><p className="mt-1 text-[17px] font-semibold themeable-text-ink">{value}</p></div>)}</div><div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="h-full rounded-full bg-prisma-blue transition-[width]" style={{ width: `${variant.metrics.completionRate}%` }} /></div></div>)}</div>}</article>;
        })}</div>}
      </div>
    </section>
    <Dialog open={testOpen} onClose={() => setTestOpen(false)} title="Criar teste A/B real" description="Escolha de 2 a 10 VSLs publicadas. O tráfego será dividido automaticamente." size="lg" footer={<><button type="button" onClick={() => setTestOpen(false)} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => void createExperiment()} disabled={creating || !name.trim() || selectedVideos.length < 2} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">{creating ? "Criando teste…" : `Criar com ${selectedVideos.length} VSLs`}</button></>}><label className="block text-[14px] font-semibold themeable-text-ink">Nome do teste<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Oferta principal — julho" className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 font-normal outline-none themeable-border-hairline themeable-text-ink" /></label><div className="mt-5"><p className="mb-2 text-[14px] font-semibold themeable-text-ink">Selecione as VSLs</p><div className="max-h-80 space-y-2 overflow-y-auto">{videos.map((video) => { const checked = selectedVideos.includes(video.id); return <button type="button" key={video.id} onClick={() => setSelectedVideos((items) => checked ? items.filter((id) => id !== video.id) : items.length < 10 ? [...items, video.id] : items)} className={`flex min-h-12 w-full items-center gap-3 rounded-[11px] border px-4 text-left themeable-border-hairline ${checked ? "bg-prisma-blue/10" : ""}`}><span className={`grid h-5 w-5 place-items-center rounded border ${checked ? "border-prisma-blue bg-prisma-blue text-white" : "themeable-border-hairline"}`}>{checked && <Check size={13} />}</span><span className="min-w-0 flex-1 truncate text-[14px] themeable-text-ink">{video.title}</span></button>; })}{videos.length < 2 && <p className="rounded-[11px] bg-amber-500/10 p-4 text-[13px] text-amber-600">Publique pelo menos duas VSLs antes de criar um teste.</p>}</div></div></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar pasta de testes" size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}><label className="block text-[14px] font-semibold themeable-text-ink">Nome<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink" /></label></Dialog>
  </>;
}
