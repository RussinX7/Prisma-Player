"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Code2, Copy, Download, ExternalLink, FileVideo2, Folder, FolderPlus, MoreHorizontal, Pencil, Play, Plus, Trash2, Upload, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/dashboard/Header";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import Dialog from "@/components/ui/Dialog";
import { createClient } from "@/lib/supabase/client";

interface StoredVideo { id: string; title: string; folder_id: string | null; mime_type: string; status: "draft" | "processing" | "ready"; signed_url: string | null; created_at: string; plays: number; player_id: string | null; published: boolean }
interface VideoFolder { id: string; name: string }
const statusByTab: Record<string, StoredVideo["status"] | undefined> = { published: "ready", drafts: "draft", processing: "processing" };

export default function VideosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoredVideo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [menuVideo, setMenuVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [videosResponse, foldersResponse] = await Promise.all([fetch("/api/videos", { cache: "no-store" }), fetch("/api/folders", { cache: "no-store" })]);
    const [videosData, foldersData] = await Promise.all([videosResponse.json(), foldersResponse.json()]);
    if (videosResponse.ok) setVideos(videosData.videos ?? []);
    if (foldersResponse.ok) setFolders(foldersData.folders ?? []);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visibleVideos = useMemo(() => videos.filter((item) => (!selectedFolder || item.folder_id === selectedFolder) && (!statusByTab[activeTab] || item.status === statusByTab[activeTab])), [activeTab, selectedFolder, videos]);
  const tabs = useMemo(() => [
    { id: "all", label: "Todos", count: videos.length },
    { id: "published", label: "Publicados", count: videos.filter((item) => item.status === "ready").length },
    { id: "drafts", label: "Rascunhos", count: videos.filter((item) => item.status === "draft").length },
    { id: "processing", label: "Processando", count: videos.filter((item) => item.status === "processing").length },
  ], [videos]);

  async function handleFile(file?: File) {
    if (!file || !file.type.startsWith("video/")) return;
    setUploading(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setUploading(false);
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-150);
    const objectPath = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("videos").upload(objectPath, file, { contentType: file.type, upsert: false });
    if (error) return setUploading(false);
    const response = await fetch("/api/videos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: file.name, objectPath, mimeType: file.type, sizeBytes: file.size, folderId: selectedFolder }) });
    if (!response.ok) await supabase.storage.from("videos").remove([objectPath]);
    setImportOpen(false); setUploading(false); await load();
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
  async function copyEmbed(video: StoredVideo) {
    if (!video.player_id || !video.published) return notify("Publique e salve o player antes de copiar o embed");
    const origin = window.location.origin;
    const title = video.title.replace(/"/g, "&quot;");
    await navigator.clipboard.writeText(`<prisma-player data-prisma-player="${video.player_id}" data-title="${title}" style="display:block;margin:0 auto;width:100%;position:relative;padding-top:56.25%;background:#000;overflow:hidden"></prisma-player>\n<script async src="${origin}/api/player-loader/${video.player_id}" data-prisma-loader="${video.player_id}"></script>`);
    notify("Código de embed copiado"); setMenuVideo(null);
  }
  async function renameVideo(video: StoredVideo) {
    const title = window.prompt("Novo nome da VSL", video.title)?.trim(); if (!title || title === video.title) return;
    const response = await fetch(`/api/videos/${video.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
    if (response.ok) { notify("VSL renomeada"); await load(); }
  }
  async function duplicateVideo(video: StoredVideo) {
    notify("Duplicando VSL…"); const response = await fetch(`/api/videos/${video.id}/duplicate`, { method: "POST" });
    if (response.ok) { notify("VSL duplicada"); await load(); } else notify("Não foi possível duplicar a VSL");
  }

  const actions = [{ label: "Upload", icon: <Upload size={16} />, primary: false, onClick: () => setImportOpen(true) }, { label: "Nova pasta", icon: <FolderPlus size={16} />, primary: false, onClick: () => setFolderOpen(true) }, { label: "Adicionar vídeo", icon: <Plus size={16} />, primary: true, onClick: () => setImportOpen(true) }];
  return <>
    <Header />
    <input ref={fileInputRef} type="file" accept="video/*" className="sr-only" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />
    <section className="dashboard-content flex flex-1 flex-col">
      <PageHeader icon={<Video size={20} />} title={selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name ?? "Pasta" : "Meus vídeos"} actions={actions}><Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} /></PageHeader>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSelectedFolder(null)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] themeable-border-hairline ${!selectedFolder ? "bg-prisma-blue text-white" : "themeable-bg-canvas themeable-text-ink"}`}><Folder size={15} />Todos</button>
        {folders.map((folder) => <div key={folder.id} className={`flex min-h-11 shrink-0 items-center rounded-full border themeable-border-hairline ${selectedFolder === folder.id ? "bg-prisma-blue text-white" : "themeable-bg-canvas themeable-text-ink"}`}><button type="button" onClick={() => setSelectedFolder(folder.id)} className="flex h-full items-center gap-2 pl-4 pr-2"><Folder size={15} />{folder.name}</button><button type="button" onClick={() => void removeFolder(folder.id)} aria-label={`Excluir ${folder.name}`} className="flex h-10 w-10 items-center justify-center"><Trash2 size={14} /></button></div>)}
      </div>
      <div className="mt-5 min-h-[360px] flex-1 rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline sm:p-6">
        {visibleVideos.length ? <div className="overflow-visible"><div className="hidden grid-cols-[minmax(260px,1fr)_130px_100px_90px] gap-4 border-b px-3 pb-3 text-[12px] font-medium uppercase tracking-wide themeable-border-hairline themeable-text-ink-muted-48 md:grid"><span>VSL</span><span>Criado em</span><span>Plays</span><span className="text-right">Ações</span></div>{visibleVideos.map((item) => <article key={item.id} className="relative grid gap-3 border-b py-4 themeable-border-hairline md:grid-cols-[minmax(260px,1fr)_130px_100px_90px] md:items-center md:px-3"><button type="button" onClick={() => edit(item)} className="flex min-w-0 items-center gap-3 text-left"><span className="grid h-12 w-20 shrink-0 place-items-center rounded-[9px] bg-black text-white"><Play size={18} fill="currentColor" /></span><span className="min-w-0"><strong className="block truncate text-[14px] themeable-text-ink">{item.title}</strong><small className="mt-1 block capitalize themeable-text-ink-muted-48">{item.published ? "Publicado" : item.status === "ready" ? "Pronto para personalizar" : item.status}</small></span></button><span className="text-[13px] themeable-text-ink-muted-48">{new Date(item.created_at).toLocaleDateString("pt-BR")}</span><span className="text-[14px] font-semibold themeable-text-ink">{item.plays ?? 0}</span><div className="flex justify-end gap-1"><button onClick={() => router.push(`/dashboard/analytics/${item.id}`)} title="Analytics" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 themeable-text-ink"><BarChart3 size={17} /></button><button onClick={() => void copyEmbed(item)} title="Copiar embed" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 themeable-text-ink"><Code2 size={17} /></button><button onClick={() => setMenuVideo(menuVideo === item.id ? null : item.id)} aria-label="Mais ações" className="grid h-10 w-10 place-items-center rounded-full hover:bg-prisma-blue/10 themeable-text-ink"><MoreHorizontal size={18} /></button></div>{menuVideo === item.id && <div className="absolute right-2 top-[72px] z-30 w-[230px] rounded-[16px] border p-1.5 shadow-2xl themeable-bg-canvas themeable-border-hairline md:top-[62px]">{[
          { label: "Editar e personalizar", icon: Pencil, action: () => edit(item) }, { label: "Ver Analytics", icon: BarChart3, action: () => router.push(`/dashboard/analytics/${item.id}`) }, { label: "Copiar código embed", icon: Code2, action: () => void copyEmbed(item) }, { label: "Abrir player", icon: ExternalLink, action: () => item.player_id && window.open(`/embed/${item.player_id}`, "_blank", "noopener,noreferrer") }, { label: "Renomear", icon: Pencil, action: () => void renameVideo(item) }, { label: "Duplicar", icon: Copy, action: () => void duplicateVideo(item) }, { label: "Download do original", icon: Download, action: () => item.signed_url && window.open(item.signed_url, "_blank", "noopener,noreferrer") }, { label: "Remover definitivamente", icon: Trash2, danger: true, action: () => { setPendingDelete(item); setMenuVideo(null); } },
        ].map((action) => { const Icon = action.icon; return <button key={action.label} onClick={action.action} className={`flex min-h-10 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[13px] hover:bg-prisma-blue/10 ${action.danger ? "text-red-500" : "themeable-text-ink"}`}><Icon size={16} />{action.label}</button>; })}</div>}</article>)}</div> : <EmptyState title="Nenhum vídeo encontrado" description={selectedFolder ? "Esta pasta ainda não tem vídeos. Faça um upload para adicioná-lo diretamente aqui." : "Seus vídeos salvos aparecerão aqui."} actionLabel="Adicionar vídeo" onAction={() => setImportOpen(true)} />}
      </div>
    </section>
    <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Importar vídeo" description={selectedFolder ? "O vídeo será salvo dentro da pasta selecionada." : "O vídeo será salvo em Todos."} size="lg"><button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }} className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-prisma-blue bg-prisma-blue/5 px-6"><FileVideo2 size={36} className="text-prisma-blue" /><h3 className="mt-5 text-[21px] font-semibold themeable-text-ink">Solte seus vídeos aqui</h3><span className="mt-5 rounded-full bg-prisma-blue px-5 py-3 text-white">{uploading ? "Enviando…" : "Escolher arquivo"}</span></button></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="A pasta ficará clicável e poderá receber seus próprios vídeos." size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}><label className="block text-[14px] font-semibold themeable-text-ink">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink" /></label></Dialog>
    <Dialog open={Boolean(pendingDelete)} onClose={() => { if (!deleting) setPendingDelete(null); }} title="Excluir VSL definitivamente?" description="Esta ação é permanente e não pode ser desfeita." size="sm" footer={<><button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => pendingDelete && void removeVideo(pendingDelete)} disabled={deleting} className="min-h-11 rounded-full bg-red-600 px-5 text-white disabled:opacity-60">{deleting ? "Excluindo…" : "Sim, excluir tudo"}</button></>}><div className="rounded-[14px] bg-red-500/10 p-4 text-[14px] leading-relaxed text-red-600">O vídeo, o player, as thumbnails, legendas e configurações de <strong>{pendingDelete?.title}</strong> serão apagados.</div></Dialog>
    {(feedback || deleting) && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 animate-status-pop rounded-full bg-[#1d1d1f] px-5 py-3 text-[14px] font-semibold text-white shadow-2xl">{deleting ? "Excluindo VSL…" : feedback}</div>}
  </>;
}
