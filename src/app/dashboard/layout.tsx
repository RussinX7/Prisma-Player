import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { VideoUploadProvider } from "@/components/uploads/VideoUploadProvider";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VideoUploadProvider><DashboardShell>{children}</DashboardShell></VideoUploadProvider>;
}
