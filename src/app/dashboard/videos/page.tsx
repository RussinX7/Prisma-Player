"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Video } from "lucide-react";
import Header from "@/components/dashboard/Header";
import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import { VideoPlayer } from "@/components/player";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = useMemo(
    () => (localVideo ? [{ src: localVideo.src, type: localVideo.type }] : []),
    [localVideo],
  );

  useEffect(() => {
    return () => {
      if (localVideo) URL.revokeObjectURL(localVideo.src);
    };
  }, [localVideo]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith("video/")) return;

    setLocalVideo({
      name: file.name,
      src: URL.createObjectURL(file),
      type: file.type,
    });
  }

  const actions = [
    {
      label: "Upload",
      icon: <Upload size={16} />,
      primary: false,
      onClick: openFilePicker,
    },
    {
      label: "Adicionar vídeo",
      icon: <Plus size={16} />,
      primary: true,
      onClick: openFilePicker,
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

        <div className="mt-5 flex min-h-[360px] flex-1 flex-col rounded-[18px] border themeable-bg-canvas themeable-border-hairline sm:mt-6">
          {localVideo ? (
            <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <VideoPlayer sources={sources} />
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
              </aside>
            </div>
          ) : (
            <EmptyState
              title="Nenhum vídeo encontrado"
              description="Seus vídeos aparecerão aqui após o primeiro upload. Para testar o MVP, selecione um arquivo do seu dispositivo."
              actionLabel="Adicionar primeiro vídeo"
              onAction={openFilePicker}
            />
          )}
        </div>
      </section>
    </>
  );
}
