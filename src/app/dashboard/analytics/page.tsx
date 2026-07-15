"use client";

import Header from "@/components/dashboard/Header";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <>
      <Header />
      <div className="flex-1 flex flex-col px-6 lg:px-8 mt-6">
        <PageHeader
          icon={<BarChart3 size={20} />}
          title="Analytics"
          actions={[
            {
              label: "Exportar",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
              primary: false,
              onClick: () => {},
            },
          ]}
        />
        <div className="flex-1 mt-6 rounded-2xl themeable-bg-canvas border themeable-border-hairline">
          <EmptyState
            title="Nenhum dado disponível"
            description="As análises dos seus vídeos aparecerão aqui após você começar a receber visualizações."
            actionLabel="Ver tutorial"
          />
        </div>
      </div>
    </>
  );
}
