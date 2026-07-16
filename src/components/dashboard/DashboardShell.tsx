"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focused = pathname.startsWith("/dashboard/analytics/");
  return <div className="min-h-dvh themeable-bg-canvas-parchment">
    {!focused && <Sidebar />}
    <main className={`flex min-h-dvh min-w-0 flex-col ${focused ? "" : "lg:pl-64"}`}>
      <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8">{children}</div>
    </main>
  </div>;
}
