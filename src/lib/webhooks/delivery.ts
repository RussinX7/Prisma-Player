import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface WebhookEvent {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, string | number | boolean | null>;
}
function blockedIp(address: string) {
  if (address === "::1" || address === "::" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!address.includes(".")) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export async function validateWebhookUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("invalid_webhook_url"); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("invalid_webhook_url");
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => blockedIp(address))) throw new Error("private_webhook_target");
  return url;
}

function discordPayload(event: WebhookEvent) {
  const fields = Object.entries(event.data).slice(0, 20).map(([name, value]) => ({ name, value: String(value ?? "—").slice(0, 1024), inline: true }));
  return {
    username: "Prisma Player",
    allowed_mentions: { parse: [] },
    embeds: [{ title: event.event === "conversion_drop" ? "Alerta de queda de conversão" : "Evento Prisma Player", description: `**${event.event}**`, color: event.event === "conversion_drop" ? 15158332 : 42495, fields, timestamp: event.timestamp }],
  };
}

export async function deliverWebhook(value: string, event: WebhookEvent) {
  const url = await validateWebhookUrl(value);
  const isDiscord = /(^|\.)discord(app)?\.com$/i.test(url.hostname) && url.pathname.includes("/api/webhooks/");
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/json", "user-agent": "Prisma-Player-Webhooks/2.0" },
    body: JSON.stringify(isDiscord ? discordPayload(event) : event),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`webhook_http_${response.status}`);
  return { status: response.status, provider: isDiscord ? "discord" : "generic" };
}
