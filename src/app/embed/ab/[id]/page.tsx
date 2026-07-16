import AbTestPlayer from "@/components/player/AbTestPlayer";

export default async function AbEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AbTestPlayer testId={id} />;
}
