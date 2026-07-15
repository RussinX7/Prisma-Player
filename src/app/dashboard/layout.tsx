import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh themeable-bg-canvas-parchment">
      <Sidebar />
      <main className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
        <div className="flex min-w-0 flex-1 flex-col pb-6 sm:pb-8">{children}</div>
      </main>
    </div>
  );
}
