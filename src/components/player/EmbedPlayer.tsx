"use client";

import { useEffect, useState, type CSSProperties } from "react";
import VideoPlayer from "./VideoPlayer";

interface Payload { title: string; source: string; type: string; config: Record<string, unknown> }

export default function EmbedPlayer({ playerId }: { playerId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => { fetch(`/api/embed/${encodeURIComponent(playerId)}?site=${encodeURIComponent(document.referrer)}`).then(async (response) => { if (!response.ok) throw new Error("player"); return response.json() as Promise<Payload>; }).then(setPayload).catch(() => setError("Este player não está disponível neste domínio.")); }, [playerId]);
  if (error) return <main className="grid min-h-dvh place-items-center bg-black p-6 text-center text-sm text-white/70">{error}</main>;
  if (!payload) return <main className="grid min-h-dvh place-items-center bg-black text-white/60">Carregando player…</main>;
  const c = payload.config;
  const style = { "--player-accent": String(c.progressColor ?? c.accent ?? "#0066cc"), "--player-progress-height": `${Number(c.progressHeight ?? 6)}px`, borderRadius: `${Number(c.radius ?? 0)}px` } as CSSProperties;
  const assetUrls = c.assetUrls && typeof c.assetUrls === "object" ? c.assetUrls as Record<string, string> : {};
  const actualProgress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const smartProgress = actualProgress >= 1 ? 100 : Math.min(99.5, (1 - Math.pow(1 - actualProgress, 2.4)) * 100);
  return <main className="grid min-h-dvh place-items-center bg-transparent"><div className="w-full" style={style}>{Boolean(c.headlineEnabled) && <h1 className="mb-4 text-center text-[clamp(18px,4vw,30px)] font-semibold text-white">{String(c.headline ?? "")}</h1>}<div className="relative overflow-hidden" style={{ borderRadius: `${Number(c.radius ?? 0)}px` }}><VideoPlayer sources={[{ src: payload.source, type: payload.type }]} poster={assetUrls.thumbnailStart} textTracks={assetUrls.captions ? [{ src: assetUrls.captions, kind: "subtitles", label: "Legendas", srclang: "pt-BR", default: true }] : []} autoplay={Boolean(c.smartAutoplay)} muted={Boolean(c.smartAutoplay) || Boolean(c.muted)} loop={Boolean(c.loop)} playbackRate={Number(c.playbackRate ?? 1)} bigPlayButton={c.bigPlay !== false} pauseWhenHidden={Boolean(c.smartPause)} onTimeUpdate={setCurrentTime} onLoadedMetadata={(metadata) => setDuration(metadata.duration)} controlVisibility={{ progressControl: !Boolean(c.smartProgress) && c.progressBar !== false, currentTimeDisplay: c.time !== false, durationDisplay: c.time !== false, volumePanel: c.volume !== false, fullscreenToggle: c.fullscreen !== false, pictureInPictureToggle: c.pictureInPicture !== false, playbackRateMenuButton: c.speedControl !== false }} />{Boolean(c.smartProgress) && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-white/25" style={{ height: `${Math.max(Number(c.progressHeight ?? 6), 4)}px` }}><div className="h-full transition-[width] duration-300 ease-out" style={{ width: `${smartProgress}%`, backgroundColor: String(c.progressColor ?? c.accent ?? "#0066cc") }} /></div>}</div></div></main>;
}
