"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { usePathname } from "next/navigation";
import {
  Video,
  FlaskConical,
  Shield,
  Target,
  Settings,
  CreditCard,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  { label: "Meus vídeos", href: "/dashboard/videos", icon: Video },
  { label: "Testes A/B", href: "/dashboard/ab-tests", icon: FlaskConical },
  { label: "Segurança", href: "/dashboard/security", icon: Shield },
  { label: "Conversões", href: "/dashboard/conversions", icon: Target },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
  { label: "Plano", href: "/dashboard/billing", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-4 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border themeable-bg-surface-pearl themeable-border-hairline themeable-text-ink transition-transform active:scale-95 lg:hidden"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40 h-dvh w-64
          themeable-bg-canvas border-r themeable-border-hairline
          flex flex-col transition-all duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b px-4 themeable-border-hairline">
          <Link
            href="/dashboard/videos"
            className="flex min-w-0 items-center"
            aria-label="Prisma Player"
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo className="h-8 w-[154px]" priority />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="flex h-11 w-11 items-center justify-center rounded-full themeable-text-ink-muted-48 transition-transform active:scale-95 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg transition-all active:scale-[0.98]
                  min-h-11 px-3 py-2.5
                  ${
                    active
                      ? "bg-prisma-blue text-white"
                      : "themeable-text-ink-muted-48 hover:themeable-bg-surface-pearl hover:themeable-text-ink"
                  }
                `}
              >
                <item.icon
                  size={20}
                  className={`flex-shrink-0 ${active ? "text-white" : ""}`}
                />
                <span className="text-[15px] font-semibold tracking-[-0.2px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t themeable-border-hairline">
          <Link
            href="#"
            className={`
              flex items-center gap-3 rounded-lg transition-all active:scale-[0.98]
              themeable-text-ink-muted-48 hover:themeable-bg-surface-pearl hover:themeable-text-ink
              min-h-11 px-3 py-2.5
            `}
          >
            <LifeBuoy size={20} className="flex-shrink-0" />
            <span className="text-[15px] font-semibold tracking-[-0.2px]">Ajuda</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
