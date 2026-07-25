import EmbedPlayer from "@/features/player/components/EmbedPlayer";
import { createEmbedOriginTokenSafely, trustedEmbedHostFromHeaders } from "@/lib/security/embed-origin";
import { headers } from "next/headers";

export const revalidate = 60;

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const trustedHost = trustedEmbedHostFromHeaders(requestHeaders);
  const originToken = createEmbedOriginTokenSafely({ playerId: id, host: trustedHost });

  return <EmbedPlayer playerId={id} originToken={originToken} />;
}
