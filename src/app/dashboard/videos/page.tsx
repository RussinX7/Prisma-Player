"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileVideo2, FolderPlus, Plus, Trash2, Upload, Video } from "lucide-react";
import Header from "@/components/dashboard/Header";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import { VideoPlayer } from "@/components/player";
import Dialog from "@/components/ui/Dialog";

const tabs = [
  { id: "all", label: "Todos", count: 0 },
  { id: "published", label: "Publicados", count: 0 },
  { id: "drafts", label: "Rascunhos", count: 0 },
  { id: "processing", label: "Processando", count: 0 },
];

interface LocalVideo {
  name: string;
  src: string;
  type: string;
}

export default function VideosPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [localVideo, setLocalVideo] = useState<LocalVideo | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("prisma-video-folders") ?? "[]") as string[]; } catch { return []; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = useMemo(
    () => (localVideo ? [{ src: localVideo.src, type: localVideo.type }] : []),
    [localVideo],
  );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith("video/")) return;

    if (localVideo) URL.revokeObjectURL(localVideo.src);
    const nextVideo = {
      name: file.name,
      src: URL.createObjectURL(file),
      type: file.type,
    };
    setLocalVideo(nextVideo);
    sessionStorage.setItem("prisma-mvp-video", JSON.stringify(nextVideo));
    setImportOpen(false);
  }

  function createFolder() {
    const name = folderName.trim();
    if (!name || folders.includes(name)) return;
    const next = [...folders, name];
    setFolders(next);
    localStorage.setItem("prisma-video-folders", JSON.stringify(next));
    setFolderName("");
    setFolderOpen(false);
  }

  function removeFolder(name: string) {
    const next = folders.filter((folder) => folder !== name);
    setFolders(next);
    localStorage.setItem("prisma-video-folders", JSON.stringify(next));
  }

  const actions = [
    {
      label: "Upload",
      icon: <Upload size={16} />,
      primary: false,
      onClick: () => setImportOpen(true),
    },
    {
      label: "Nova pasta",
      icon: <FolderPlus size={16} />,
      primary: false,
      onClick: () => setFolderOpen(true),
    },
    {
      label: "Adicionar vídeo",
      icon: <Plus size={16} />,
      primary: true,
      onClick: () => setImportOpen(true),
    },
  ];

  return (
    <>
      <Header />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.m3u8"
        className="sr-only"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <section className="dashboard-content flex flex-1 flex-col">
        <PageHeader icon={<Video size={20} />} title="Meus vídeos" actions={actions}>
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </PageHeader>

        {folders.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{folders.map((folder) => <div key={folder} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-white px-4 text-[13px] themeable-border-hairline dark:bg-white/5"><FolderPlus size={15} className="text-prisma-blue" /><span>{folder}</span><button type="button" onClick={() => removeFolder(folder)} aria-label={`Excluir pasta ${folder}`} className="ml-1 text-[#86868b] hover:text-red-500"><Trash2 size={14} /></button></div>)}</div>}

        <div className="mt-5 flex min-h-[360px] flex-1 flex-col rounded-[18px] border themeable-bg-canvas themeable-border-hairline sm:mt-6">
          {localVideo ? (
            <div className="grid justify-center gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,760px)_280px]">
              <div className="w-full max-w-[760px] overflow-hidden rounded-[16px]">
                <VideoPlayer sources={sources} />
              </div>
              <aside className="min-w-0 rounded-[11px] themeable-bg-surface-pearl p-5">
                <p className="text-[12px] uppercase tracking-[0.08em] themeable-text-ink-muted-48">Prévia local</p>
                <h3 className="mt-2 break-words text-[17px] font-semibold tracking-[-0.374px] themeable-text-ink">
                  {localVideo.name}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed themeable-text-ink-muted-48">
                  Este arquivo permanece apenas no seu navegador. Nenhum vídeo ou token foi enviado para uma API.
                </p>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="mt-5 min-h-11 w-full rounded-full border px-4 text-[14px] text-prisma-blue themeable-border-hairline transition-transform active:scale-95"
                >
                  Trocar vídeo
                </button>
                <Link href="/studio" className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-prisma-blue px-4 text-[14px] text-white transition-transform active:scale-95">
                  Personalizar VSL
                </Link>
              </aside>
            </div>
          ) : (
            <EmptyState
              title="Nenhum vídeo encontrado"
              description="Seus vídeos aparecerão aqui após o primeiro upload. Para testar o MVP, selecione um arquivo do seu dispositivo."
              actionLabel="Adicionar primeiro vídeo"
              onAction={() => setImportOpen(true)}
            />
          )}
        </div>
      </section>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Importar vídeo" description="Nesta fase o arquivo permanece somente no navegador." size="lg">
        <button type="button" onClick={openFilePicker} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }} className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-prisma-blue bg-prisma-blue/5 px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-prisma-blue text-white"><Upload size={26} /></div>
          <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.35px] themeable-text-ink">Solte seu vídeo aqui</h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed themeable-text-ink-muted-48">Arraste um arquivo ou clique para navegar no dispositivo. MP4, WebM, MOV ou uma fonte compatível com o navegador.</p>
          <span className="mt-6 flex min-h-11 items-center gap-2 rounded-full bg-prisma-blue px-5 text-[14px] text-white"><FileVideo2 size={16} />Escolher arquivo</span>
        </button>
      </Dialog>
      <Dialog open={folderOpen} onClose={() => setFolderOpen(false)} title="Criar nova pasta" description="Organize seus vídeos no navegador durante o MVP." size="sm" footer={<button type="button" onClick={createFolder} disabled={!folderName.trim() || folders.includes(folderName.trim())} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white disabled:opacity-40">Criar pasta</button>}>
        <label className="block text-[14px] font-semibold themeable-text-ink">Nome da pasta<input value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createFolder(); }} placeholder="Ex.: Campanha de julho" className="mt-2 h-11 w-full rounded-full border bg-transparent px-4 font-normal outline-none themeable-border-hairline themeable-text-ink focus:border-prisma-blue" /></label>
      </Dialog>
    </>
  );
}
