"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Code2, Copy, Download, ExternalLink, FileVideo2, Folder, FolderPlus, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, Upload, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import Dialog from "@/components/ui/Dialog";
import { useVideoUploads } from "@/features/videos/components/VideoUploadProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { StoredVideo, VideoFolder } from "@/features/videos/model/types";
import { videosService } from "@/services/videos/client";

const statusByTab: Record<string, StoredVideo["status"] | undefined> = { published: "ready", drafts: "draft", processing: "processing" };
const PAGE_SIZE = 4;

function buildPageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1]! > 1 ? ["gap" as const, page] : [page]));
}

export default function VideosPage() {
  const router = useRouter();
  const { tasks, startUpload } = useVideoUploads();
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [preparingUpload, setPreparingUpload] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoredVideo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [manageVideo, setManageVideo] = useState<StoredVideo | null>(null);
  const [manageMode, setManageMode] = useState<"rename" | "move">("rename");
  const [manageTitle, setManageTitle] = useState("");
  const [manageFolder, setManageFolder] = useState<string>("");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [videosData, foldersData] = await Promise.all([
      videosService.list(),
      videosService.listFolders(),
    ]);
    setVideos(videosData.videos ?? []);
    setFolders(foldersData.folders ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("prisma:videos-changed", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("prisma:videos-changed", refresh); };
  }, [load]);

  const visibleVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return videos.filter((item) => (!selectedFolder || item.folder_id === selectedFolder) && (!statusByTab[activeTab] || item.status === statusByTab[activeTab]) && (!normalizedQuery || item.title.toLocaleLowerCase("pt-BR").includes(normalizedQuery)));
  }, [activeTab, query, selectedFolder, videos]);

  const pageCount = Math.max(1, Math.ceil(visibleVideos.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedVideos = useMemo(
    () => visibleVideos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visibleVideos, currentPage],
  );

  const filterKey = `${activeTab}|${query}|${selectedFolder ?? ""}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const tabs = useMemo(() => [
    { id: "all", label: "Todos", count: videos.length },
    { id: "published", label: "Publicados", count: videos.filter((item) => item.status === "ready").length },
    { id: "drafts", label: "Rascunhos", count: videos.filter((item) => item.status === "draft").length },
    { id: "processing", label: "Processando", count: videos.filter((item) => item.status === "processing").length },
  ], [videos]);

  async function handleFile(file?: File) {
    if (!file || !file.type.startsWith("video/")) { notify("Escolha um arquivo de vídeo válido"); return; }
    if (file.size > 5 * 1024 ** 3) { notify("O limite por vídeo é 5 GB"); return; }
    setPreparingUpload(true);
    try {
      const video = await startUpload(file, selectedFolder);
      setVideos((current) => [{ ...video, signed_url: null, plays: 0, player_id: null, published: false }, ...current.filter((item) => item.id !== video.id)]);
      setImportOpen(false);
      setActiveTab("processing");
      notify("Upload iniciado. Você pode continuar usando a dashboard.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível iniciar o upload");
    } finally {
      setPreparingUpload(false);
    }
  }

  async function createFolder() {
    const name = folderName.trim(); if (!name) return;
    const data = await videosService.createFolder(name);
    setSelectedFolder(data.folder.id);
    setFolderName("");
    setFolderOpen(false);
    await load();
  }

  async function removeFolder(id: string) { if (!confirm("Excluir esta pasta? Os vídeos voltarão para Todos.")) return; await videosService.removeFolder(id); if (selectedFolder === id) setSelectedFolder(null); await load(); }

  function edit(video: StoredVideo) {
    if (!video.signed_url) return;
    sessionStorage.setItem("prisma-mvp-video", JSON.stringify({ id: video.id, name: video.title, src: video.signed_url, type: video.mime_type }));
    router.push("/studio");
  }

  async function removeVideo(video: StoredVideo) {
    setDeleting(true);
    try {
      await videosService.remove(video.id);
      setPendingDelete(null);
      setFeedback("VSL excluída definitivamente");
      window.setTimeout(() => setFeedback(""), 2400);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  function notify(message: string) { setFeedback(message); window.setTimeout(() => setFeedback(""), 2400); }

  async function ensurePlayer(video: StoredVideo) {
    if (video.player_id && video.published) return video.player_id;
    notify("Publicando player…");
    try {
      const payload = await videosService.publishPlayer(video.id);
      setVideos((items) => items.map((item) => item.id === video.id ? { ...item, player_id: payload.playerConfig.id, published: true } : item));
      return payload.playerConfig.id;
    } catch {
      notify("Não foi possível publicar o player");
      return null;
    }
  }

  async function copyEmbed(video: StoredVideo) {
    const playerId = await ensurePlayer(video); if (!playerId) return;
    const origin = window.location.origin;
    const title = video.title.replace(/"/g, "&quot;");
    await navigator.clipboard.writeText(`<prisma-player data-prisma-player="${playerId}" data-title="${title}" style="display:block;margin:0 auto;width:100%;height:1px;position:relative;background:transparent;border:0;overflow:hidden"></prisma-player>\n<script async src="${origin}/api/player-loader/${playerId}?v=3" data-prisma-loader="${playerId}"></script>`);
    notify("Código de embed copiado");
  }

  async function openPlayer(video: StoredVideo) {
    const tab = window.open("about:blank", "_blank");
    const playerId = await ensurePlayer(video);
    if (!playerId) { tab?.close(); return; }
    if (tab) { tab.opener = null; tab.location.href = `/embed/${playerId}`; }
  }

  function startManage(video: StoredVideo, mode: "rename" | "move") {
    setManageVideo(video); setManageMode(mode); setManageTitle(video.title); setManageFolder(video.folder_id ?? "");
  }

  async function saveManage() {
    if (!manageVideo) return;
    const body = manageMode === "rename" ? { title: manageTitle.trim() } : { folderId: manageFolder || null };
    if (manageMode === "rename" && !manageTitle.trim()) return;
    await videosService.update(manageVideo.id, body);
    notify(manageMode === "rename" ? "Nome da VSL atualizado" : "VSL movida para a pasta escolhida");
    setManageVideo(null);
    await load();
  }

  async function duplicateVideo(video: StoredVideo) {
    notify("Duplicando VSL…");
    try {
      await videosService.duplicate(video.id);
      notify("VSL duplicada");
      await load();
    } catch {
      notify("Não foi possível duplicar a VSL");
    }
  }

  const actions = [{ label: "Upload", icon: <Upload size={15} />, primary: false, onClick: () => setImportOpen(true) }, { label: "Nova pasta", icon: <FolderPlus size={15} />, primary: false, onClick: () => setFolderOpen(true) }, { label: "Adicionar vídeo", icon: <Plus size={15} />, primary: true, onClick: () => setImportOpen(true) }];

  return <>
    <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />
    <section className="videos-library-page dashboard-content flex min-w-0 flex-col space-y-5">
      <PageHeader icon={<Video size={20} />} title={selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name ?? "Pasta" : "Meus vídeos"}>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"><span className="flex items-center gap-2 text-xs font-medium text-slate-500"><Video size={15} className="text-[#191A23]" />Biblioteca</span><strong className="mt-2 block text-2xl font-bold text-[#191A23]">{videos.length}</strong><small className="text-slate-500 font-medium">VSLs organizadas na conta</small></article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"><span className="flex items-center gap-2 text-xs font-medium text-slate-500"><CheckCircle2 size={15} className="text-emerald-500" />Publicadas</span><strong className="mt-2 block text-2xl font-bold text-[#191A23]">{tabs.find((item) => item.id === "published")?.count ?? 0}</strong><small className="text-slate-500 font-medium">Players disponíveis nas páginas</small></article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"><span className="flex items-center gap-2 text-xs font-medium text-slate-500"><Clock3 size={15} className="text-amber-500" />Em andamento</span><strong className="mt-2 block text-2xl font-bold text-[#191A23]">{tabs.find((item) => item.id === "processing")?.count ?? 0}</strong><small className="text-slate-500 font-medium">Uploads e processamento ativos</small></article>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedFolder(null)}
            className={`flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-all cursor-pointer border ${
              !selectedFolder
                ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Folder size={15} />Todos
          </button>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`flex min-h-9 shrink-0 items-center rounded-xl border transition-all ${
                selectedFolder === folder.id
                  ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedFolder(folder.id)}
                className="flex h-full items-center gap-2 pl-3.5 pr-1.5 text-xs font-bold text-[#191A23]"
              >
                <Folder size={15} />{folder.name}
              </button>
              <button
                type="button"
                onClick={() => void removeFolder(folder.id)}
                aria-label={`Excluir ${folder.name}`}
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <label className="relative block w-full lg:w-[280px]">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Buscar vídeo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome da VSL"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-xs font-medium text-[#191A23] outline-none transition focus:border-[#B9FF66]"
          />
        </label>
      </div>

      <div className="min-h-[360px] rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-[#191A23]">
              {selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name : "Todos os vídeos"}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {visibleVideos.length} resultado{visibleVideos.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex min-h-9 items-center gap-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6ee50] border border-black/5 px-4 text-xs font-bold text-[#191A23] shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />Nova VSL
          </button>
        </div>
        <div className="p-4 sm:p-6">
        {visibleVideos.length ? <div className="overflow-visible"><div className="hidden grid-cols-[minmax(260px,1fr)_130px_100px_90px] gap-4 border-b border-slate-100 px-3 pb-3 text-xs font-semibold uppercase text-slate-400 md:grid"><span>VSL</span><span>Criado em</span><span>Plays</span><span className="text-right">Ações</span></div>{pagedVideos.map((item) => { const task = tasks.find((candidate) => candidate.videoId === item.id); const progress = task?.progress ?? (item.status === "ready" ? 100 : 0); return <article key={item.id} className="relative grid gap-4 border-b border-slate-100 py-4 last:border-b-0 md:grid-cols-[minmax(260px,1fr)_130px_100px_90px] md:items-center md:px-3"><button type="button" disabled={item.status !== "ready"} onClick={() => edit(item)} className="flex min-w-0 items-center gap-3 text-left disabled:cursor-wait"><span className="relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-900 text-white md:h-12 md:w-20"><Play size={16} fill="currentColor" />{item.status === "processing" && <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25"><span className="block h-full bg-[#B9FF66] transition-[width]" style={{ width: `${progress}%` }} /></span>}</span><span className="min-w-0"><strong className="block truncate text-sm font-bold text-[#191A23]">{item.title}</strong><small className="mt-0.5 block text-xs font-medium text-slate-500">{item.published ? "Publicado" : item.status === "ready" ? "Pronto para personalizar" : item.status === "processing" ? `Enviando e processando · ${progress}%` : item.status === "failed" ? "Falha no upload" : "Rascunho"}</small>{task?.error && <small className="mt-1 block text-red-500">{task.error}</small>}</span></button><div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 md:contents"><span className="text-xs font-medium text-slate-600"><small className="mb-1 block uppercase tracking-wide md:hidden">Criado em</small>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span><span className="text-sm font-bold text-[#191A23]"><small className="mb-1 block text-[10px] font-normal uppercase tracking-wide text-slate-400 md:hidden">Plays</small>{item.plays ?? 0}</span></div><div className="flex justify-end gap-1 border-t border-slate-100 pt-3 md:border-0 md:pt-0"><button disabled={item.status !== "ready"} onClick={() => router.push(`/dashboard/analytics/${item.id}`)} title="Analytics" aria-label="Ver Analytics" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><BarChart3 size={16} /></button><button disabled={item.status !== "ready"} onClick={() => void copyEmbed(item)} title="Copiar embed" aria-label="Copiar código embed" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><Code2 size={16} /></button>
        
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button disabled={item.status === "processing"} aria-label="Mais ações" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"><MoreHorizontal size={17} /></button>
            }
          />
          <DropdownMenuContent align="end" className="w-[230px] p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg">
            {[
              { label: "Editar e personalizar", icon: Pencil, action: () => edit(item) },
              { label: "Ver Analytics", icon: BarChart3, action: () => router.push(`/dashboard/analytics/${item.id}`) },
              { label: "Copiar código embed", icon: Code2, action: () => void copyEmbed(item) },
              { label: "Abrir player", icon: ExternalLink, action: () => void openPlayer(item) },
              { label: "Renomear", icon: Pencil, action: () => startManage(item, "rename") },
              { label: "Mover para pasta", icon: Folder, action: () => startManage(item, "move") },
              { label: "Duplicar", icon: Copy, action: () => void duplicateVideo(item) },
              { label: "Download do original", icon: Download, action: () => item.signed_url && window.open(item.signed_url, "_blank", "noopener,noreferrer") },
              { label: "Remover definitivamente", icon: Trash2, danger: true, action: () => { setPendingDelete(item); } },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.action}
                  className={`flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer outline-none ${action.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"}`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        </div></article>; })}
        {pageCount > 1 && <nav aria-label="Paginação de VSLs" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 pt-4">
          <p className="text-xs font-medium text-slate-500">Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visibleVideos.length)} de {visibleVideos.length}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Página anterior" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={15} /></button>
            {buildPageItems(currentPage, pageCount).map((item, index) => item === "gap"
              ? <span key={`gap-${index}`} aria-hidden className="grid h-8 w-8 place-items-center text-xs text-slate-400">…</span>
              : <button key={item} type="button" onClick={() => setPage(item)} aria-label={`Página ${item}`} aria-current={item === currentPage ? "page" : undefined} className={`grid h-8 min-w-8 place-items-center rounded-lg border text-xs font-semibold transition ${item === currentPage ? "border-black/5 bg-[#B9FF66] text-[#191A23] font-bold shadow-xs" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{item}</button>)}
            <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Próxima página" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={15} /></button>
          </div>
        </nav>}
        </div> : <EmptyState title="Nenhum vídeo encontrado" description={selectedFolder ? "Esta pasta ainda não tem vídeos. Faça um upload para adicioná-lo diretamente aqui." : "Seus vídeos salvos aparecerão aqui."} actionLabel="Adicionar vídeo" onAction={() => setImportOpen(true)} />}
        </div>
      </div>
    </section>
    <Dialog open={importOpen} onClose={() => { if (!preparingUpload) setImportOpen(false); }} title="Importar vídeo" description="Depois de escolher o arquivo, o envio continua em segundo plano e aparece em Processando." size="lg"><button type="button" disabled={preparingUpload} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }} className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 disabled:cursor-wait disabled:opacity-70"><FileVideo2 size={36} className="text-[#191A23]" /><h3 className="mt-4 text-xl font-bold text-[#191A23]">Solte seu vídeo aqui</h3><p className="mt-2 max-w-md text-center text-xs font-medium text-slate-500">Uploads grandes usam multipart e vão direto para a nuvem. Limite padrão de 5 GB por arquivo.</p><span className="mt-5 rounded-xl bg-[#B9FF66] border border-black/5 px-5 py-2.5 text-xs font-bold text-[#191A23] shadow-xs">{preparingUpload ? "Preparando upload…" : "Escolher arquivo"}</span></button></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="A pasta ficará clicável e poderá receber seus próprios vídeos." size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-10 rounded-xl bg-[#B9FF66] border border-black/5 px-5 text-xs font-bold text-[#191A23] shadow-xs disabled:opacity-40">Criar pasta</button>}><label className="block text-xs font-semibold text-[#191A23]">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" /></label></Dialog>
    <Dialog open={Boolean(manageVideo)} onClose={() => setManageVideo(null)} title={manageMode === "rename" ? "Renomear VSL" : "Mover VSL"} description={manageMode === "rename" ? "Escolha um nome claro para encontrar este vídeo depois." : "Selecione a pasta de destino. O vídeo e seu player serão preservados."} size="sm" footer={<><button type="button" onClick={() => setManageVideo(null)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700">Cancelar</button><button type="button" onClick={() => void saveManage()} disabled={manageMode === "rename" && !manageTitle.trim()} className="min-h-10 rounded-xl bg-[#B9FF66] border border-black/5 px-5 text-xs font-bold text-[#191A23] shadow-xs disabled:opacity-40">{manageMode === "rename" ? "Salvar nome" : "Mover vídeo"}</button></>}>
      {manageMode === "rename" ? <label className="block text-xs font-semibold text-[#191A23]">Nome do vídeo<input autoFocus value={manageTitle} maxLength={200} onChange={(event) => setManageTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveManage(); }} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]" /></label> : <label className="block text-xs font-semibold text-[#191A23]">Pasta de destino<select value={manageFolder} onChange={(event) => setManageFolder(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#B9FF66]"><option value="">Todos os vídeos (sem pasta)</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>}
    </Dialog>
    <Dialog open={Boolean(pendingDelete)} onClose={() => { if (!deleting) setPendingDelete(null); }} title="Excluir VSL definitivamente?" description="Esta ação é permanente e não pode ser desfeita." size="sm" footer={<><button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="min-h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700">Cancelar</button><button type="button" onClick={() => pendingDelete && void removeVideo(pendingDelete)} disabled={deleting} className="min-h-10 rounded-xl bg-red-600 px-5 text-xs font-bold text-white shadow-xs disabled:opacity-60">{deleting ? "Excluindo…" : "Sim, excluir tudo"}</button></>}><div className="rounded-xl bg-red-50 p-4 text-xs font-medium leading-relaxed text-red-700">O vídeo, o player, as thumbnails, legendas e configurações de <strong>{pendingDelete?.title}</strong> serão apagados.</div></Dialog>
    {(feedback || deleting) && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 animate-status-pop rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl">{deleting ? "Excluindo VSL…" : feedback}</div>}
  </>;
}
