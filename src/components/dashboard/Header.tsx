"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "./AccountMenu";
import { Bell } from "lucide-react";

export default function Header(props: { title?: string; description?: string }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  return (
    <header aria-label={props.title ? `${props.title}: ações da conta` : "Ações da conta"} className="sticky top-0 z-30 themeable-bg-canvas/80 backdrop-blur-xl border-b themeable-border-hairline">
      <div className="flex min-h-16 items-center justify-end gap-3 px-4 pl-16 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          <ThemeToggle />

          <div className="relative"><button
            type="button"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-expanded={notificationsOpen}
            aria-label="Notificações"
            className="relative flex h-11 w-11 items-center justify-center rounded-full themeable-bg-surface-pearl themeable-text-ink-muted-48 transition-transform active:scale-95"
          >
            <Bell size={16} />
          </button>{notificationsOpen && <div className="absolute right-0 top-[calc(100%+10px)] w-[min(320px,calc(100vw-24px))] rounded-[18px] border p-4 themeable-bg-canvas themeable-border-hairline"><p className="text-[14px] font-semibold themeable-text-ink">Notificações</p><p className="mt-2 text-[13px] leading-relaxed themeable-text-ink-muted-48">Nenhum alerta novo. Eventos de segurança e processamento aparecerão aqui.</p></div>}</div>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
