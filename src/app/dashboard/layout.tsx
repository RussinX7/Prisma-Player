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
    <div className="min-h-dvh themeable-bg-canvas-parchment flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-dvh lg:ml-64">
        <div className="flex-1 flex flex-col pb-8">{children}</div>
      </main>
    </div>
  );
}
