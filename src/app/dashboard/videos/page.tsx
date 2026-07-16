"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileVideo2, Folder, FolderPlus, Plus, Trash2, Upload, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/dashboard/Header";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import Dialog from "@/components/ui/Dialog";
import { createClient } from "@/lib/supabase/client";

interface StoredVideo { id: string; title: string; folder_id: string | null; mime_type: string; status: "draft" | "processing" | "ready"; signed_url: string | null; created_at: string }
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
        {visibleVideos.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleVideos.map((item) => <article key={item.id} className="group overflow-hidden rounded-[14px] border themeable-border-hairline"><button type="button" onClick={() => edit(item)} className="block w-full text-left"><div className="aspect-video bg-black">{item.signed_url && <video src={item.signed_url} preload="metadata" muted controlsList="nodownload" onContextMenu={(event) => event.preventDefault()} className="h-full w-full object-contain" />}</div></button><div className="flex items-center gap-3 p-4"><button type="button" onClick={() => edit(item)} className="min-w-0 flex-1 text-left"><h3 className="truncate font-semibold themeable-text-ink">{item.title}</h3><p className="mt-1 text-[12px] capitalize themeable-text-ink-muted-48">{item.status === "ready" ? "Publicado" : item.status}</p></button><button type="button" onClick={() => setPendingDelete(item)} title="Apagar VSL definitivamente" aria-label={`Apagar ${item.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/10"><Trash2 size={17} /></button></div></article>)}</div> : <EmptyState title="Nenhum vídeo encontrado" description={selectedFolder ? "Esta pasta ainda não tem vídeos. Faça um upload para adicioná-lo diretamente aqui." : "Seus vídeos salvos aparecerão aqui."} actionLabel="Adicionar vídeo" onAction={() => setImportOpen(true)} />}
      </div>
    </section>
    <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Importar vídeo" description={selectedFolder ? "O vídeo será salvo dentro da pasta selecionada." : "O vídeo será salvo em Todos."} size="lg"><button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files?.[0]); }} className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-prisma-blue bg-prisma-blue/5 px-6"><FileVideo2 size={36} className="text-prisma-blue" /><h3 className="mt-5 text-[21px] font-semibold themeable-text-ink">Solte seus vídeos aqui</h3><span className="mt-5 rounded-full bg-prisma-blue px-5 py-3 text-white">{uploading ? "Enviando…" : "Escolher arquivo"}</span></button></Dialog>
    <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="A pasta ficará clicável e poderá receber seus próprios vídeos." size="sm" footer={<button type="button" onClick={() => void createFolder()} disabled={!folderName.trim()} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}><label className="block text-[14px] font-semibold themeable-text-ink">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 outline-none themeable-border-hairline themeable-text-ink" /></label></Dialog>
    <Dialog open={Boolean(pendingDelete)} onClose={() => { if (!deleting) setPendingDelete(null); }} title="Excluir VSL definitivamente?" description="Esta ação é permanente e não pode ser desfeita." size="sm" footer={<><button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => pendingDelete && void removeVideo(pendingDelete)} disabled={deleting} className="min-h-11 rounded-full bg-red-600 px-5 text-white disabled:opacity-60">{deleting ? "Excluindo…" : "Sim, excluir tudo"}</button></>}><div className="rounded-[14px] bg-red-500/10 p-4 text-[14px] leading-relaxed text-red-600">O vídeo, o player, as thumbnails, legendas e configurações de <strong>{pendingDelete?.title}</strong> serão apagados.</div></Dialog>
    {(feedback || deleting) && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 animate-status-pop rounded-full bg-[#1d1d1f] px-5 py-3 text-[14px] font-semibold text-white shadow-2xl">{deleting ? "Excluindo VSL…" : feedback}</div>}
  </>;
}
