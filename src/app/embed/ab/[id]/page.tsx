import AbTestPlayer from "@/features/player/components/AbTestPlayer";
import { createEmbedOriginTokenSafely, trustedEmbedHostFromHeaders } from "@/lib/security/embed-origin";
import { headers } from "next/headers";

export default async function AbEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const trustedHost = trustedEmbedHostFromHeaders(requestHeaders);
  const originToken = createEmbedOriginTokenSafely({ playerId: "*", host: trustedHost });

  return <AbTestPlayer testId={id} originToken={originToken} />;
}
