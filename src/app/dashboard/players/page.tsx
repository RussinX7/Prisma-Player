"use client";

import Header from "@/components/dashboard/Header";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import { PlaySquare } from "lucide-react";

export default function PlayersPage() {
  return (
    <>
      <Header />
      <div className="flex-1 flex flex-col px-6 lg:px-8 mt-6">
        <PageHeader
          icon={<PlaySquare size={20} />}
          title="Players"
          actions={[
            {
              label: "Criar Player",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              ),
              primary: true,
              onClick: () => {},
            },
          ]}
        />
        <div className="flex-1 mt-6 rounded-2xl themeable-bg-canvas border themeable-border-hairline">
          <EmptyState
            title="Nenhum player criado"
            description="Crie seu primeiro player personalizado para começar a exibir seus vídeos com a identidade da sua marca."
            actionLabel="Criar player"
          />
        </div>
      </div>
    </>
  );
}
