"use client";

import Header from "@/components/dashboard/Header";
import PageHeader from "@/components/dashboard/PageHeader";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <Header />
      <div className="flex-1 flex flex-col px-6 lg:px-8 mt-6">
        <PageHeader
          icon={<Settings size={20} />}
          title="Configurações"
          actions={[
            {
              label: "Salvar",
              primary: true,
              onClick: () => {},
            },
          ]}
        />

        <div className="flex-1 mt-6 rounded-2xl themeable-bg-canvas border themeable-border-hairline p-6 lg:p-8 space-y-8">
          <section>
            <h3 className="text-[17px] font-semibold tracking-[-0.374px] themeable-text-ink mb-4">
              Perfil
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-medium tracking-[-0.2px] themeable-text-ink-muted-48 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  defaultValue="Rayna"
                  className="w-full h-11 px-4 rounded-pill themeable-bg-canvas border themeable-border-hairline text-[15px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium tracking-[-0.2px] themeable-text-ink-muted-48 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  defaultValue="rayna@prismaplayer.com.br"
                  className="w-full h-11 px-4 rounded-pill themeable-bg-canvas border themeable-border-hairline text-[15px] themeable-text-ink placeholder:themeable-text-ink-muted-48 outline-none focus:border-prisma-blue focus:ring-1 focus:ring-prisma-blue transition-colors"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[17px] font-semibold tracking-[-0.374px] themeable-text-ink mb-4">
              Plano
            </h3>
            <div className="p-5 rounded-xl themeable-bg-surface-pearl border themeable-border-hairline flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.2px] themeable-text-ink">
                  Plano Essential
                </p>
                <p className="text-[13px] tracking-[-0.2px] themeable-text-ink-muted-48 mt-0.5">
                  3 vídeos ativos · 1 player · Suporte padrão
                </p>
              </div>
              <button className="px-4 py-2 bg-prisma-blue text-white rounded-full text-[13px] font-medium tracking-[-0.2px] hover:opacity-90 transition-all active:scale-[0.97]">
                Fazer upgrade
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
