"use client";

import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "./AccountMenu";
import { Bell } from "lucide-react";

interface HeaderProps {
  title?: string;
  description?: string;
}

export default function Header({
  title = "Meus vídeos",
  description = "Gerencie seus vídeos e players",
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 themeable-bg-canvas/80 backdrop-blur-xl border-b themeable-border-hairline">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 pl-16 sm:px-6 sm:pl-16 lg:px-8 lg:pl-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-prisma-blue/10 flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-prisma-blue"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="hidden min-w-0 sm:block">
            <h1 className="text-[17px] font-semibold tracking-[-0.374px] themeable-text-ink leading-tight">
              {title}
            </h1>
            <p className="text-[12px] tracking-[-0.12px] themeable-text-ink-muted-48">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg themeable-bg-surface-pearl">
              <span className="text-[12px] tracking-[-0.12px] themeable-text-ink-muted-48">
                Vídeos
              </span>
              <span className="text-[14px] font-semibold tracking-[-0.2px] text-prisma-blue">
                12
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg themeable-bg-surface-pearl">
              <span className="text-[12px] tracking-[-0.12px] themeable-text-ink-muted-48">
                Plays
              </span>
              <span className="text-[14px] font-semibold tracking-[-0.2px] text-prisma-blue">
                1.4K
              </span>
            </div>
          </div>

          <ThemeToggle />

          <button
            aria-label="Notificações"
            className="relative flex h-11 w-11 items-center justify-center rounded-full themeable-bg-surface-pearl themeable-text-ink-muted-48 transition-transform active:scale-95"
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-prisma-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
