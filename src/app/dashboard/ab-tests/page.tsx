"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Check, FlaskConical, FolderPlus, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
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

  const headerActions = [
    { label: "Nova pasta", icon: <FolderPlus size={16} />, primary: false, onClick: () => setFolderOpen(true) },
    { label: "Novo teste", icon: <Plus size={16} />, primary: true, onClick: () => setTestOpen(true) }
  ];

  return <>
    <section className="dashboard-content flex flex-1 flex-col space-y-6">
      <PageHeader
        icon={<FlaskConical size={20} />}
        title="Testes A/B de VSL"
        actions={headerActions}
      />

      <div className="flex min-h-[430px] flex-1 flex-col rounded-[30px] border-2 border-[#191A23] bg-white p-2 shadow-[4px_4px_0px_#191A23]">
        {folders.length > 0 && <div className="flex gap-2 overflow-x-auto border-b-2 border-[#191A23]/10 p-4">{folders.map((folder) => <span key={folder.id} className="flex min-h-10 shrink-0 items-center gap-2 rounded-full border-2 border-[#191A23] bg-white px-4 text-xs font-black text-[#191A23] shadow-[2px_2px_0px_#191A23]"><FolderPlus size={15} className="text-[#191A23]" />{folder.name}</span>)}</div>}
        <div className="flex border-b-2 border-[#191A23]/10 p-4 sm:justify-end">
          <label className="relative block w-full sm:w-[300px]">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#191A23]/60" />
            <span className="sr-only">Pesquisar testes</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar testes A/B" className="h-10 w-full rounded-full border-2 border-[#191A23] bg-white pl-11 pr-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] outline-none focus:bg-[#B9FF66]/20" />
          </label>
        </div>
        {visible.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[3px_3px_0px_#191A23]"><FlaskConical size={32} /></div><h3 className="mt-5 text-2xl font-black text-[#191A23]">Nenhum teste A/B ativo</h3><p className="mt-2 max-w-md text-xs font-medium text-[#191A23]/70">Selecione pelo menos duas VSLs publicadas. As métricas começam zeradas e crescem somente com visitantes reais.</p><button type="button" onClick={() => setTestOpen(true)} className="mt-6 min-h-11 rounded-full border-2 border-[#191A23] bg-[#B9FF66] px-6 text-xs font-black text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 cursor-pointer">Criar primeiro teste A/B</button></div> : <div className="divide-y-2 divide-[#191A23]/10">{visible.map((test) => {
          const totals = test.ab_test_variants.reduce((sum, variant) => sum + variant.metrics.impressions, 0);
          return <article key={test.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23]"><BarChart3 size={20} /></div><button type="button" onClick={() => setExpanded(expanded === test.id ? null : test.id)} className="min-w-0 flex-1 text-left"><h3 className="truncate text-base font-black text-[#191A23]">{test.name}</h3><p className="mt-0.5 text-xs font-medium text-[#191A23]/70">{test.ab_test_variants.length} VSLs · {totals} impressões reais</p></button><span className="w-fit rounded-full border border-[#191A23] bg-[#B9FF66] px-3 py-1 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">Ativo</span><button type="button" onClick={() => void copyEmbed(test.id)} className="min-h-10 rounded-full border-2 border-[#191A23] bg-white px-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]/20 cursor-pointer">{copied === test.id ? "Embed copiado" : "Copiar embed A/B"}</button><button type="button" onClick={() => void removeTest(test.id)} className="flex h-10 w-10 items-center justify-center rounded-full text-red-600 hover:bg-red-100 cursor-pointer"><Trash2 size={16} /></button></div>{expanded === test.id && <div className="mt-5 grid gap-3 xl:grid-cols-2">{test.ab_test_variants.map((variant) => <div key={variant.id} className="rounded-2xl border-2 border-[#191A23] bg-white p-4 shadow-[3px_3px_0px_#191A23]"><div className="flex items-center justify-between gap-3"><h4 className="truncate font-black text-[#191A23]">{videoTitle(variant)}</h4><span className="text-xs font-bold text-[#191A23]/70">Tráfego {variant.weight}%</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Impressões", variant.metrics.impressions], ["Play rate", `${variant.metrics.playRate.toFixed(1)}%`], ["Chegaram a 75%", `${variant.metrics.retention75.toFixed(1)}%`], ["Conclusão", `${variant.metrics.completionRate.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#191A23]/20 bg-[#F3F3F3] p-3"><p className="text-[10px] font-bold text-[#191A23]/60 uppercase">{label}</p><p className="mt-1 text-base font-black text-[#191A23]">{value}</p></div>)}</div><div className="mt-4 h-2 overflow-hidden rounded-full border border-[#191A23] bg-[#F3F3F3]"><div className="h-full rounded-full bg-[#B9FF66] transition-[width]" style={{ width: `${variant.metrics.completionRate}%` }} /></div></div>)}</div>}</article>;
        })}</div>}
      </div>
    </section>

    <Dialog open={testOpen} onClose={() => setTestOpen(false)} title="Criar teste A/B real" description="Escolha de 2 a 10 VSLs publicadas. O tráfego será dividido automaticamente." size="lg" footer={<><button type="button" onClick={() => setTestOpen(false)} className="min-h-11 rounded-full border-2 border-[#191A23] bg-white px-5 text-xs font-bold text-[#191A23]">Cancelar</button><button type="button" onClick={() => void createExperiment()} disabled={creating || !name.trim() || selectedVideos.length < 2} className="min-h-11 rounded-full border-2 border-[#191A23] bg-[#B9FF66] px-5 text-xs font-black text-[#191A23] shadow-[2px_2px_0px_#191A23] disabled:opacity-40">{creating ? "Criando teste…" : `Criar com ${selectedVideos.length} VSLs`}</button></>}><label className="block text-xs font-bold uppercase text-[#191A23]">Nome do teste<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Oferta principal — julho" className="mt-2 h-11 w-full rounded-2xl border-2 border-[#191A23] bg-white px-4 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] outline-none" /></label><div className="mt-5"><p className="mb-2 text-xs font-bold uppercase text-[#191A23]">Selecione as VSLs</p><div className="max-h-80 space-y-2 overflow-y-auto">{videos.map((video) => { const checked = selectedVideos.includes(video.id); return <button type="button" key={video.id} onClick={() => setSelectedVideos((items) => checked ? items.filter((id) => id !== video.id) : items.length < 10 ? [...items, video.id] : items)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-[#191A23] px-4 text-left font-bold ${checked ? "bg-[#B9FF66]" : "bg-white"}`}><span className={`grid h-5 w-5 place-items-center rounded-lg border-2 border-[#191A23] ${checked ? "bg-[#191A23] text-[#B9FF66]" : "bg-white"}`}>{checked && <Check size={13} />}</span><span className="min-w-0 flex-1 truncate text-xs font-bold text-[#191A23]">{video.title}</span></button>; })}{videos.length < 2 && <p className="rounded-2xl border-2 border-[#191A23] bg-amber-100 p-4 text-xs font-bold text-amber-900">Publique pelo menos duas VSLs antes de criar um teste.</p>}</div></div></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar pasta de testes" size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full border-2 border-[#191A23] bg-[#B9FF66] px-5 text-xs font-black text-[#191A23] shadow-[2px_2px_0px_#191A23] disabled:opacity-40">Criar pasta</button>}><label className="block text-xs font-bold uppercase text-[#191A23]">Nome<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border-2 border-[#191A23] bg-white px-4 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] outline-none" /></label></Dialog>
  </>;
}
