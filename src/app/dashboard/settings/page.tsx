"use client";

import Header from "@/components/dashboard/Header";
import PageHeader from "@/components/dashboard/PageHeader";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <Header title="Configurações" description="Gerencie sua conta e seu plano" />
      <div className="dashboard-content flex flex-1 flex-col">
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

        <div className="mt-5 flex-1 space-y-8 rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline sm:mt-6 sm:p-6 lg:p-8">
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
            <div className="flex flex-col gap-4 rounded-[11px] border p-5 themeable-bg-surface-pearl themeable-border-hairline sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.2px] themeable-text-ink">
                  Plano Essential
                </p>
                <p className="text-[13px] tracking-[-0.2px] themeable-text-ink-muted-48 mt-0.5">
                  3 vídeos ativos · 1 player · Suporte padrão
                </p>
              </div>
              <button className="min-h-11 rounded-full bg-prisma-blue px-4 py-2 text-[13px] font-normal tracking-[-0.2px] text-white transition-transform active:scale-95">
                Fazer upgrade
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
