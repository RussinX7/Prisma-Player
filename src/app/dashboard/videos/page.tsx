"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, Code2, Copy, Download, ExternalLink, FileVideo2, Folder, FolderPlus, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, Upload, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/dashboard/Header";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import Dialog from "@/components/ui/Dialog";
import { useVideoUploads } from "@/features/videos/components/VideoUploadProvider";

interface StoredVideo { id: string; title: string; folder_id: string | null; mime_type: string; status: "draft" | "processing" | "ready" | "failed"; signed_url: string | null; created_at: string; plays: number; player_id: string | null; published: boolean }
interface VideoFolder { id: string; name: string }
const statusByTab: Record<string, StoredVideo["status"] | undefined> = { published: "ready", drafts: "draft", processing: "processing" };

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
  const [menuVideo, setMenuVideo] = useState<string | null>(null);
  const [manageVideo, setManageVideo] = useState<StoredVideo | null>(null);
  const [manageMode, setManageMode] = useState<"rename" | "move">("rename");
  const [manageTitle, setManageTitle] = useState("");
  const [manageFolder, setManageFolder] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [videosResponse, foldersResponse] = await Promise.all([fetch("/api/videos", { cache: "no-store" }), fetch("/api/folders", { cache: "no-store" })]);
    const [videosData, foldersData] = await Promise.all([videosResponse.json(), foldersResponse.json()]);
    if (videosResponse.ok) setVideos(videosData.videos ?? []);
    if (foldersResponse.ok) setFolders(foldersData.folders ?? []);
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
    const response = await fetch("/api/folders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (response.ok) { setSelectedFolder(data.folder.id); setFolderName(""); setFolderOpen(false); await load(); }
  }
  async function removeFolder(id: string) { if (!confirm("Excluir esta pasta? Os vídeos voltarão para Todos.")) return; await fetch(`/api/folders/${id}`, { method: "DELETE" }); if (selectedFolder === id) setSelectedFolder(null); await load(); }
  function edit(video: StoredVideo) {
    if (!video.signed_url) return;
    sessionStorage.setItem("prisma-mvp-video", JSON.stringify({ id: video.id, name: video.title, src: video.signed_url, type: video.mime_type }));
    router.push("/studio");
  }
  async function removeVideo(video: StoredVideo) {
    setDeleting(true);
    const response = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
    setDeleting(false);
    if (response.ok) { setPendingDelete(null); setFeedback("VSL excluída definitivamente"); window.setTimeout(() => setFeedback(""), 2400); await load(); }
  }
  function notify(message: string) { setFeedback(message); window.setTimeout(() => setFeedback(""), 2400); }
  async function ensurePlayer(video: StoredVideo) {
    if (video.player_id && video.published) return video.player_id;
    notify("Publicando player…");
    const response = await fetch("/api/player-configs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: video.id }) });
    const payload = await response.json().catch(() => null) as { playerConfig?: { id?: string } } | null;
    if (!response.ok || !payload?.playerConfig?.id) { notify("Não foi possível publicar o player"); return null; }
    setVideos((items) => items.map((item) => item.id === video.id ? { ...item, player_id: payload.playerConfig!.id!, published: true } : item));
    return payload.playerConfig.id;
  }
  async function copyEmbed(video: StoredVideo) {
    const playerId = await ensurePlayer(video); if (!playerId) return;
    const origin = window.location.origin;
    const title = video.title.replace(/"/g, "&quot;");
    await navigator.clipboard.writeText(`<prisma-player data-prisma-player="${playerId}" data-title="${title}" style="display:block;margin:0 auto;width:100%;height:1px;position:relative;background:transparent;border:0;overflow:hidden"></prisma-player>\n<script async src="${origin}/api/player-loader/${playerId}?v=3" data-prisma-loader="${playerId}"></script>`);
    notify("Código de embed copiado"); setMenuVideo(null);
  }
  async function openPlayer(video: StoredVideo) {
    const tab = window.open("about:blank", "_blank");
    const playerId = await ensurePlayer(video);
    if (!playerId) { tab?.close(); return; }
    if (tab) { tab.opener = null; tab.location.href = `/embed/${playerId}`; }
  }
  function startManage(video: StoredVideo, mode: "rename" | "move") {
    setManageVideo(video); setManageMode(mode); setManageTitle(video.title); setManageFolder(video.folder_id ?? ""); setMenuVideo(null);
  }
  async function saveManage() {
    if (!manageVideo) return;
    const body = manageMode === "rename" ? { title: manageTitle.trim() } : { folderId: manageFolder || null };
    if (manageMode === "rename" && !manageTitle.trim()) return;
    const response = await fetch(`/api/videos/${manageVideo.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) { notify(manageMode === "rename" ? "Nome da VSL atualizado" : "VSL movida para a pasta escolhida"); setManageVideo(null); await load(); }
  }
  async function duplicateVideo(video: StoredVideo) {
    notify("Duplicando VSL…"); const response = await fetch(`/api/videos/${video.id}/duplicate`, { method: "POST" });
    if (response.ok) { notify("VSL duplicada"); await load(); } else notify("Não foi possível duplicar a VSL");
  }

  const actions = [{ label: "Upload", icon: <Upload size={16} />, primary: false, onClick: () => setImportOpen(true) }, { label: "Nova pasta", icon: <FolderPlus size={16} />, primary: false, onClick: () => setFolderOpen(true) }, { label: "Adicionar vídeo", icon: <Plus size={16} />, primary: true, onClick: () => setImportOpen(true) }];
  useEffect(() => {
    document.documentElement.classList.add("hide-page-scrollbar");
    return () => document.documentElement.classList.remove("hide-page-scrollbar");
  }, []);
  return <>
    <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />
    <section className="videos-library-page dashboard-content flex min-w-0 flex-1 flex-col overflow-x-hidden">
      <PageHeader icon={<Video size={20} />} title={selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name ?? "Pasta" : "Meus vídeos"} actions={actions}><Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} /></PageHeader>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline"><span className="flex items-center gap-2 text-[12px] themeable-text-ink-muted-48"><Video size={15} className="text-prisma-blue" />Biblioteca</span><strong className="mt-2 block text-[24px] tracking-[-.5px] themeable-text-ink">{videos.length}</strong><small className="themeable-text-ink-muted-48">VSLs organizadas na conta</small></article>
        <article className="rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline"><span className="flex items-center gap-2 text-[12px] themeable-text-ink-muted-48"><CheckCircle2 size={15} className="text-green-500" />Publicadas</span><strong className="mt-2 block text-[24px] tracking-[-.5px] themeable-text-ink">{tabs.find((item) => item.id === "published")?.count ?? 0}</strong><small className="themeable-text-ink-muted-48">Players disponíveis nas páginas</small></article>
        <article className="rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline"><span className="flex items-center gap-2 text-[12px] themeable-text-ink-muted-48"><Clock3 size={15} className="text-amber-500" />Em andamento</span><strong className="mt-2 block text-[24px] tracking-[-.5px] themeable-text-ink">{tabs.find((item) => item.id === "processing")?.count ?? 0}</strong><small className="themeable-text-ink-muted-48">Uploads e processamento ativos</small></article>
      </div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSelectedFolder(null)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] themeable-border-hairline ${!selectedFolder ? "bg-prisma-blue text-white" : "themeable-bg-canvas themeable-text-ink"}`}><Folder size={15} />Todos</button>
        {folders.map((folder) => <div key={folder.id} className={`flex min-h-11 shrink-0 items-center rounded-full border themeable-border-hairline ${selectedFolder === folder.id ? "bg-prisma-blue text-white" : "themeable-bg-canvas themeable-text-ink"}`}><button type="button" onClick={() => setSelectedFolder(folder.id)} className="flex h-full items-center gap-2 pl-4 pr-2"><Folder size={15} />{folder.name}</button><button type="button" onClick={() => void removeFolder(folder.id)} aria-label={`Excluir ${folder.name}`} className="flex h-10 w-10 items-center justify-center"><Trash2 size={14} /></button></div>)}
        </div>
        <label className="relative block w-full lg:w-[300px]"><Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 themeable-text-ink-muted-48" /><span className="sr-only">Buscar vídeo</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome da VSL" className="h-11 w-full rounded-full border bg-transparent pl-11 pr-4 text-[13px] outline-none transition focus:border-prisma-blue themeable-border-hairline themeable-text-ink" /></label>
      </div>
      <div className="mt-4 min-h-[360px] flex-1 overflow-hidden rounded-[20px] border themeable-bg-canvas themeable-border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 themeable-border-hairline"><div><h2 className="text-[15px] font-semibold themeable-text-ink">{selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name : "Todos os vídeos"}</h2><p className="mt-0.5 text-[12px] themeable-text-ink-muted-48">{visibleVideos.length} resultado{visibleVideos.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setImportOpen(true)} className="flex min-h-10 items-center gap-2 rounded-full bg-prisma-blue px-4 text-[12px] font-semibold text-white"><Plus size={15} />Nova VSL</button></div>
        <div className={`p-4 transition-[padding] sm:p-5 ${menuVideo ? "pb-[390px] sm:pb-[390px]" : ""}`}>
        {visibleVideos.length ? <div className="overflow-visible"><div className="hidden grid-cols-[minmax(260px,1fr)_130px_100px_90px] gap-4 border-b px-3 pb-3 text-[12px] font-medium uppercase tracking-wide themeable-border-hairline themeable-text-ink-muted-48 md:grid"><span>VSL</span><span>Criado em</span><span>Plays</span><span className="text-right">Ações</span></div>{visibleVideos.map((item) => { const task = tasks.find((candidate) => candidate.videoId === item.id); const progress = task?.progress ?? (item.status === "ready" ? 100 : 0); return <article key={item.id} className="relative grid gap-4 border-b py-5 themeable-border-hairline md:grid-cols-[minmax(260px,1fr)_130px_100px_90px] md:items-center md:px-3"><button type="button" disabled={item.status !== "ready"} onClick={() => edit(item)} className="flex min-w-0 items-center gap-3 text-left disabled:cursor-wait"><span className="relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-black text-white md:h-12 md:w-20 md:rounded-[9px]"><Play size={18} fill="currentColor" />{item.status === "processing" && <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25"><span className="block h-full bg-prisma-blue transition-[width]" style={{ width: `${progress}%` }} /></span>}</span><span className="min-w-0"><strong className="block truncate text-[14px] themeable-text-ink">{item.title}</strong><small className="mt-1 block themeable-text-ink-muted-48">{item.published ? "Publicado" : item.status === "ready" ? "Pronto para personalizar" : item.status === "processing" ? `Enviando e processando · ${progress}%` : item.status === "failed" ? "Falha no upload" : "Rascunho"}</small>{task?.error && <small className="mt-1 block text-red-500">{task.error}</small>}</span></button><div className="grid grid-cols-2 gap-3 rounded-[14px] bg-black/[0.025] p-3 dark:bg-white/[0.04] md:contents"><span className="text-[12px] themeable-text-ink-muted-48"><small className="mb-1 block uppercase tracking-wide md:hidden">Criado em</small>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span><span className="text-[14px] font-semibold themeable-text-ink"><small className="mb-1 block text-[10px] font-normal uppercase tracking-wide themeable-text-ink-muted-48 md:hidden">Plays</small>{item.plays ?? 0}</span></div><div className="flex justify-end gap-1 border-t pt-3 themeable-border-hairline md:border-0 md:pt-0"><button disabled={item.status !== "ready"} onClick={() => router.push(`/dashboard/analytics/${item.id}`)} title="Analytics" aria-label="Ver Analytics" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 disabled:opacity-30 themeable-text-ink"><BarChart3 size={17} /></button><button disabled={item.status !== "ready"} onClick={() => void copyEmbed(item)} title="Copiar embed" aria-label="Copiar código embed" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 disabled:opacity-30 themeable-text-ink"><Code2 size={17} /></button><button disabled={item.status === "processing"} onClick={() => setMenuVideo(menuVideo === item.id ? null : item.id)} aria-expanded={menuVideo === item.id} aria-label="Mais ações" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 disabled:opacity-30 themeable-text-ink"><MoreHorizontal size={18} /></button></div>{menuVideo === item.id && <><button type="button" aria-label="Fechar ações" onClick={() => setMenuVideo(null)} className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] md:hidden" /><div className="scrollbar-none fixed inset-x-3 bottom-3 z-50 grid max-h-[calc(100dvh-24px)] grid-cols-2 gap-1 overflow-y-auto rounded-[20px] border p-2 shadow-2xl themeable-bg-canvas themeable-border-hairline md:absolute md:inset-x-auto md:bottom-auto md:right-2 md:top-[62px] md:z-30 md:block md:max-h-none md:w-[230px] md:overflow-visible md:rounded-[16px] md:p-1.5">{[
          { label: "Editar e personalizar", icon: Pencil, action: () => edit(item) }, { label: "Ver Analytics", icon: BarChart3, action: () => router.push(`/dashboard/analytics/${item.id}`) }, { label: "Copiar código embed", icon: Code2, action: () => void copyEmbed(item) }, { label: "Abrir player", icon: ExternalLink, action: () => void openPlayer(item) }, { label: "Renomear", icon: Pencil, action: () => startManage(item, "rename") }, { label: "Mover para pasta", icon: Folder, action: () => startManage(item, "move") }, { label: "Duplicar", icon: Copy, action: () => void duplicateVideo(item) }, { label: "Download do original", icon: Download, action: () => item.signed_url && window.open(item.signed_url, "_blank", "noopener,noreferrer") }, { label: "Remover definitivamente", icon: Trash2, danger: true, action: () => { setPendingDelete(item); setMenuVideo(null); } },
        ].map((action) => { const Icon = action.icon; return <button key={action.label} onClick={action.action} className={`flex min-h-12 w-full items-center gap-2 rounded-[12px] px-3 text-left text-[12px] hover:bg-prisma-blue/10 md:min-h-10 md:gap-3 md:text-[13px] ${action.danger ? "text-red-500" : "themeable-text-ink"}`}><Icon size={16} className="shrink-0" />{action.label}</button>; })}</div></>}</article>; })}</div> : <EmptyState title="Nenhum vídeo encontrado" description={selectedFolder ? "Esta pasta ainda não tem vídeos. Faça um upload para adicioná-lo diretamente aqui." : "Seus vídeos salvos aparecerão aqui."} actionLabel="Adicionar vídeo" onAction={() => setImportOpen(true)} />}
        </div>
      </div>
    </section>
    <Dialog open={importOpen} onClose={() => { if (!preparingUpload) setImportOpen(false); }} title="Importar vídeo" description="Depois de escolher o arquivo, o envio continua em segundo plano e aparece em Processando." size="lg"><button type="button" disabled={preparingUpload} onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }} className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-prisma-blue bg-prisma-blue/5 px-6 disabled:cursor-wait disabled:opacity-70"><FileVideo2 size={36} className="text-prisma-blue" /><h3 className="mt-5 text-[21px] font-semibold themeable-text-ink">Solte seu vídeo aqui</h3><p className="mt-2 max-w-md text-center text-[13px] themeable-text-ink-muted-48">Uploads grandes usam multipart e vão direto para o Cloudflare R2. Limite padrão de 20 GB por arquivo.</p><span className="mt-5 rounded-full bg-prisma-blue px-5 py-3 text-white">{preparingUpload ? "Preparando upload…" : "Escolher arquivo"}</span></button></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="A pasta ficará clicável e poderá receber seus próprios vídeos." size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}><label className="block text-[14px] font-semibold themeable-text-ink">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink" /></label></Dialog>
    <Dialog open={Boolean(manageVideo)} onClose={() => setManageVideo(null)} title={manageMode === "rename" ? "Renomear VSL" : "Mover VSL"} description={manageMode === "rename" ? "Escolha um nome claro para encontrar este vídeo depois." : "Selecione a pasta de destino. O vídeo e seu player serão preservados."} size="sm" footer={<><button type="button" onClick={() => setManageVideo(null)} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => void saveManage()} disabled={manageMode === "rename" && !manageTitle.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">{manageMode === "rename" ? "Salvar nome" : "Mover vídeo"}</button></>}>
      {manageMode === "rename" ? <label className="block text-[14px] font-semibold themeable-text-ink">Nome do vídeo<input autoFocus value={manageTitle} maxLength={200} onChange={(event) => setManageTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveManage(); }} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink" /></label> : <label className="block text-[14px] font-semibold themeable-text-ink">Pasta de destino<select value={manageFolder} onChange={(event) => setManageFolder(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink"><option value="">Todos os vídeos (sem pasta)</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>}
    </Dialog>
    <Dialog open={Boolean(pendingDelete)} onClose={() => { if (!deleting) setPendingDelete(null); }} title="Excluir VSL definitivamente?" description="Esta ação é permanente e não pode ser desfeita." size="sm" footer={<><button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => pendingDelete && void removeVideo(pendingDelete)} disabled={deleting} className="min-h-11 rounded-full bg-red-600 px-5 text-white disabled:opacity-60">{deleting ? "Excluindo…" : "Sim, excluir tudo"}</button></>}><div className="rounded-[14px] bg-red-500/10 p-4 text-[14px] leading-relaxed text-red-600">O vídeo, o player, as thumbnails, legendas e configurações de <strong>{pendingDelete?.title}</strong> serão apagados.</div></Dialog>
    {(feedback || deleting) && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 animate-status-pop rounded-full bg-[#1d1d1f] px-5 py-3 text-[14px] font-semibold text-white shadow-2xl">{deleting ? "Excluindo VSL…" : feedback}</div>}
  </>;
}
