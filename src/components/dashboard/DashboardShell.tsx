"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import AccessGate from "@/features/access/components/AccessGate";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldFocus = pathname.startsWith("/dashboard/analytics/")
    || pathname.startsWith("/dashboard/videos/editor")
    || pathname.startsWith("/dashboard/settings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return <div className="min-h-dvh themeable-bg-canvas-parchment">
    {!shouldFocus && <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />}
    <main className={`flex min-h-dvh min-w-0 flex-col transition-[padding] duration-300 ${shouldFocus ? "" : sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
      <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8"><AccessGate>{children}</AccessGate></div>
    </main>
  </div>;
}
