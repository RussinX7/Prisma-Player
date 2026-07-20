"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import AccessGate from "@/features/access/components/AccessGate";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldFocus = pathname.startsWith("/dashboard/analytics/")
    || pathname.startsWith("/dashboard/videos/editor")
    || pathname.startsWith("/dashboard/settings");

  if (shouldFocus) {
    return (
      <div className="min-h-dvh themeable-bg-canvas-parchment">
        <main className="flex min-h-dvh min-w-0 flex-col">
          <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8">
            <AccessGate>{children}</AccessGate>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AppShell>
      <AccessGate>{children}</AccessGate>
    </AppShell>
  );
}
