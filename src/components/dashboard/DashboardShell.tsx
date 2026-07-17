"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import AccessGate from "@/features/access/components/AccessGate";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldFocus = pathname.startsWith("/dashboard/analytics/") || pathname.startsWith("/dashboard/videos/editor");
  const [sidebarHidden, setSidebarHidden] = useState(shouldFocus);

  useEffect(() => {
    setSidebarHidden(shouldFocus);
  }, [shouldFocus, pathname]);

  return <div className="min-h-dvh themeable-bg-canvas-parchment">
    {!sidebarHidden && <Sidebar />}
    <button
      type="button"
      onClick={() => setSidebarHidden((value) => !value)}
      className={`fixed top-3 z-[60] hidden h-10 items-center gap-2 rounded-full border bg-white/90 px-3 text-[13px] font-medium shadow-sm backdrop-blur themeable-border-hairline themeable-text-ink transition lg:inline-flex ${sidebarHidden ? "left-4" : "left-[276px]"}`}
      aria-label={sidebarHidden ? "Mostrar menu lateral" : "Ocultar menu lateral"}
    >
      {sidebarHidden ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      {sidebarHidden ? "Menu" : "Ocultar"}
    </button>
    <main className={`flex min-h-dvh min-w-0 flex-col transition-[padding] duration-300 ${sidebarHidden ? "" : "lg:pl-64"}`}>
      <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8"><AccessGate>{children}</AccessGate></div>
    </main>
  </div>;
}
