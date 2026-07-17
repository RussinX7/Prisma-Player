import AbTestPlayer from "@/features/player/components/AbTestPlayer";

export default async function AbEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AbTestPlayer testId={id} />;
}
