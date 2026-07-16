import AnalyticsWorkspace from "@/components/analytics/AnalyticsWorkspace";

export default async function VideoAnalyticsPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  return <AnalyticsWorkspace videoId={videoId} />;
}
