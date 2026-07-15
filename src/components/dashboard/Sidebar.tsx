"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  PlaySquare,
  BarChart3,
  Settings,
  LifeBuoy,
  ChevronLeft,
  Menu,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Vídeos", href: "/dashboard/videos", icon: Video },
  { label: "Players", href: "/dashboard/players", icon: PlaySquare },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-full themeable-bg-surface-pearl border themeable-border-hairline themeable-text-ink transition-all active:scale-90"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-dvh
          themeable-bg-canvas border-r themeable-border-hairline
          flex flex-col transition-all duration-300 ease-out
          ${collapsed ? "w-16" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b themeable-border-hairline">
          <Link
            href="/dashboard"
            className={`flex min-w-0 items-center ${collapsed ? "justify-center w-full" : ""}`}
            aria-label="Prisma Player"
          >
            <Image
              src="/assets/logo.png"
              alt="Prisma Player"
              width={154}
              height={35}
              priority
              className={collapsed ? "h-7 w-7 object-cover object-left" : "h-8 w-auto max-w-[154px] object-contain"}
            />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-full themeable-text-ink-muted-48 hover:themeable-bg-surface-pearl transition-all active:scale-90"
          >
            <ChevronLeft
              size={14}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
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
                  ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}
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
                {!collapsed && (
                  <span className="text-[15px] font-medium tracking-[-0.2px]">
                    {item.label}
                  </span>
                )}
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
              ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}
            `}
          >
            <LifeBuoy size={20} className="flex-shrink-0" />
            {!collapsed && (
              <span className="text-[15px] font-medium tracking-[-0.2px]">Ajuda</span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}
