import EmbedPlayer from "@/features/player/components/EmbedPlayer";
import { createEmbedOriginToken, trustedEmbedHostFromHeaders } from "@/lib/security/embed-origin";
import { headers } from "next/headers";

export default async function EmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const trustedHost = trustedEmbedHostFromHeaders(requestHeaders);
  const originToken = createEmbedOriginToken({ playerId: id, host: trustedHost });

  return <EmbedPlayer playerId={id} originToken={originToken} />;
}
