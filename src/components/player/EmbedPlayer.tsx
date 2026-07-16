"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import VideoPlayer from "./VideoPlayer";

interface Payload { title: string; source: string; type: string; config: Record<string, unknown> }

interface Tracking { testId: string; variantId: string; sessionId: string }

export default function EmbedPlayer({ playerId, tracking }: { playerId: string; tracking?: Tracking }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const sentEvents = useRef(new Set<string>());
  const trackingTestId = tracking?.testId;
  const trackingVariantId = tracking?.variantId;
  const trackingSessionId = tracking?.sessionId;

  const track = (eventType: "impression" | "play" | "progress" | "complete", progressPercent = 0, watchedSeconds = 0) => {
    if (!tracking) return;
    const key = `${eventType}:${progressPercent}`;
    if (sentEvents.current.has(key)) return;
    sentEvents.current.add(key);
    void fetch("/api/ab-events", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...tracking, eventType, progressPercent, watchedSeconds }) });
  };

  useEffect(() => {
    fetch(`/api/embed/${encodeURIComponent(playerId)}?site=${encodeURIComponent(document.referrer)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(String(response.status)); return response.json() as Promise<Payload>; })
      .then(setPayload)
      .catch((reason: Error) => setError(reason.message === "403" ? "Este domínio não está autorizado a exibir o player." : "Player não encontrado ou ainda não publicado."));
  }, [playerId]);

  useEffect(() => {
    if (!payload || !trackingTestId || !trackingVariantId || !trackingSessionId || sentEvents.current.has("impression:0")) return;
    sentEvents.current.add("impression:0");
    void fetch("/api/ab-events", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ testId: trackingTestId, variantId: trackingVariantId, sessionId: trackingSessionId, eventType: "impression", progressPercent: 0, watchedSeconds: 0 }) });
  }, [payload, trackingSessionId, trackingTestId, trackingVariantId]);

  useEffect(() => {
    const blockContext = (event: MouseEvent) => event.preventDefault();
    const blockDrag = (event: DragEvent) => event.preventDefault();
    const blockShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) || (event.ctrlKey && ["u", "s"].includes(key))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("dragstart", blockDrag);
    document.addEventListener("keydown", blockShortcuts, true);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("dragstart", blockDrag);
      document.removeEventListener("keydown", blockShortcuts, true);
    };
  }, []);

  if (error) return <main className="grid min-h-dvh place-items-center bg-black p-6 text-center text-sm text-white/70">{error}</main>;
  if (!payload) return <main className="grid min-h-dvh place-items-center bg-black text-white/60"><span className="animate-pulse">Carregando player…</span></main>;

  const c = payload.config;
  const style = { "--player-accent": String(c.progressColor ?? c.accent ?? "#0066cc"), "--player-progress-height": `${Number(c.progressHeight ?? 6)}px`, borderRadius: `${Number(c.radius ?? 0)}px` } as CSSProperties;
  const assetUrls = c.assetUrls && typeof c.assetUrls === "object" ? c.assetUrls as Record<string, string> : {};
  const actualProgress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const smartProgress = actualProgress >= 1 ? 100 : Math.min(99.5, (1 - Math.pow(1 - actualProgress, 2.4)) * 100);

  return <main className="grid min-h-dvh select-none place-items-center bg-transparent" onContextMenu={(event) => event.preventDefault()}>
    <div className="w-full" style={style}>
      {Boolean(c.headlineEnabled) && <h1 className="mb-4 text-center text-[clamp(18px,4vw,30px)] font-semibold text-white">{String(c.headline ?? "")}</h1>}
      <div className="relative overflow-hidden" style={{ borderRadius: `${Number(c.radius ?? 0)}px` }}>
        <VideoPlayer sources={[{ src: payload.source, type: payload.type }]} poster={Boolean(c.thumbnailEnabled) && !Boolean(c.smartAutoplay) ? assetUrls.thumbnailStart : undefined} textTracks={assetUrls.captions ? [{ src: assetUrls.captions, kind: "subtitles", label: "Legendas", srclang: "pt-BR", default: true }] : []} autoplay={Boolean(c.smartAutoplay)} muted={Boolean(c.smartAutoplay) || Boolean(c.muted)} loop={Boolean(c.loop)} playbackRate={Number(c.playbackRate ?? 1)} bigPlayButton={c.bigPlay !== false} pauseWhenHidden={Boolean(c.smartPause)} onPlay={() => track("play", 0, currentTime)} onEnded={() => track("complete", 100, duration)} onTimeUpdate={(time) => { setCurrentTime(time); if (duration > 0) [25, 50, 75].forEach((point) => { if (time / duration * 100 >= point) track("progress", point, time); }); }} onLoadedMetadata={(metadata) => setDuration(metadata.duration)} controlVisibility={{ progressControl: !Boolean(c.smartProgress) && c.progressBar !== false, currentTimeDisplay: c.time !== false, durationDisplay: c.time !== false, volumePanel: c.volume !== false, fullscreenToggle: c.fullscreen !== false, pictureInPictureToggle: c.pictureInPicture !== false, playbackRateMenuButton: c.speedControl !== false }} />
        {Boolean(c.smartProgress) && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-transparent" style={{ height: `${Math.max(Number(c.progressHeight ?? 6), 4)}px` }}><div className="h-full transition-[width] duration-300 ease-out" style={{ width: `${smartProgress}%`, backgroundColor: String(c.progressColor ?? c.accent ?? "#0066cc") }} /></div>}
      </div>
    </div>
  </main>;
}
