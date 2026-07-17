import EmbedPlayer from "@/features/player/components/EmbedPlayer";

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmbedPlayer playerId={id} />;
}
