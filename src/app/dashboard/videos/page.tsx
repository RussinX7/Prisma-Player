"use client";

import { useState } from "react";
import Header from "@/components/dashboard/Header";
import InfoBanner from "@/components/dashboard/InfoBanner";
import PromoBanner from "@/components/dashboard/PromoBanner";
import PageHeader from "@/components/dashboard/PageHeader";
import Tabs from "@/components/dashboard/Tabs";
import EmptyState from "@/components/dashboard/EmptyState";
import { Video } from "lucide-react";

const tabs = [
  { id: "all", label: "Todos", count: 0 },
  { id: "published", label: "Publicados", count: 0 },
  { id: "drafts", label: "Rascunhos", count: 0 },
  { id: "processing", label: "Processando", count: 0 },
];

export default function VideosPage() {
  const [activeTab, setActiveTab] = useState("all");
  const isEmpty = true;

  return (
    <>
      <Header />
      <InfoBanner />
      <PromoBanner />

      <div className="flex-1 flex flex-col px-6 lg:px-8 mt-6">
        <PageHeader
          icon={<Video size={20} />}
          title="Vídeos"
        >
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </PageHeader>

        <div className="flex-1 mt-6 rounded-2xl themeable-bg-canvas border themeable-border-hairline">
          {isEmpty ? (
            <EmptyState
              title="Nenhum vídeo encontrado"
              description="Seus vídeos aparecerão aqui após o primeiro upload. Comece enviando seu primeiro arquivo de vídeo."
            />
          ) : (
            <div className="p-6">{/* video grid/content */}</div>
          )}
        </div>
      </div>
    </>
  );
}
