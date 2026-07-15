"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Languages, LogOut, Settings, Wallet } from "lucide-react";

const languages = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState("pt-BR");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex h-11 w-11 items-center justify-center rounded-full bg-prisma-blue text-[13px] font-semibold text-white transition-transform active:scale-95">
        Rb
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-24px))] rounded-[18px] border p-2 themeable-bg-canvas themeable-border-hairline">
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prisma-blue text-[13px] font-semibold text-white">Rb</div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold themeable-text-ink">Raynan Barbosa Felix</p>
              <p className="truncate text-[12px] themeable-text-ink-muted-48">raynanbarbosa803@gmail.com</p>
            </div>
          </div>
          <div className="border-t py-2 themeable-border-hairline">
            <button type="button" onClick={() => setLanguageOpen((value) => !value)} className="flex min-h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[14px] themeable-text-ink">
              <Languages size={17} className="text-prisma-blue" />
              <span className="flex-1">Idioma</span>
              <ChevronDown size={15} className={languageOpen ? "rotate-180" : ""} />
            </button>
            {languageOpen && (
              <div className="mt-1 rounded-[11px] themeable-bg-surface-pearl p-1">
                {languages.map((item) => (
                  <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[14px] themeable-text-ink">
                    <span>{item.flag}</span><span className="flex-1 text-left">{item.label}</span>{language === item.code && <Check size={16} className="text-prisma-blue" />}
                  </button>
                ))}
              </div>
            )}
            <Link href="/dashboard/settings" className="flex min-h-11 items-center gap-3 rounded-[11px] px-3 text-[14px] themeable-text-ink"><Settings size={17} /><span>Conta</span></Link>
            <Link href="/dashboard/settings" className="flex min-h-11 items-center gap-3 rounded-[11px] px-3 text-[14px] themeable-text-ink"><Wallet size={17} /><span>Financeiro</span></Link>
          </div>
          <Link href="/login" className="flex min-h-11 w-full items-center gap-3 border-t px-3 pt-2 text-[14px] text-red-500 themeable-border-hairline"><LogOut size={17} /><span>Sair</span></Link>
        </div>
      )}
    </div>
  );
}
