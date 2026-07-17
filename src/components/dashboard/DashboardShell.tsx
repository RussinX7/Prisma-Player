"use client";

import Sidebar from "@/components/dashboard/Sidebar";
import AccessGate from "@/features/access/components/AccessGate";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh themeable-bg-canvas-parchment">
    <Sidebar />
    <main className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
      <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8"><AccessGate>{children}</AccessGate></div>
    </main>
  </div>;
}
