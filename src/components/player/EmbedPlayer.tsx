"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import VideoPlayer from "./VideoPlayer";

interface Payload { videoId: string; title: string; source: string; type: string; config: Record<string, unknown> }

interface Tracking { testId: string; variantId: string; sessionId: string }

export default function EmbedPlayer({ playerId, tracking }: { playerId: string; tracking?: Tracking }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoRatio, setVideoRatio] = useState<number | null>(null);
  const [resumePoint, setResumePoint] = useState<number | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  const [autoplayActivated, setAutoplayActivated] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [restartWithSoundSignal, setRestartWithSoundSignal] = useState(0);
  const [resumePlaybackSignal, setResumePlaybackSignal] = useState(0);
  const [thumbnailOverlay, setThumbnailOverlay] = useState<"pause" | "end" | null>(null);
  const sentEvents = useRef(new Set<string>());
  const analyticsEvents = useRef(new Set<string>());
  const sessionId = useRef("");
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

  const trackAnalytics = (eventType: "impression" | "play" | "progress" | "complete" | "cta_click", progressPercent = 0, watchedSeconds = 0) => {
    if (!payload?.videoId || !sessionId.current) return;
    const key = `${eventType}:${progressPercent}`;
    if (analyticsEvents.current.has(key)) return;
    analyticsEvents.current.add(key);
    void fetch("/api/analytics-events", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: payload.videoId, sessionId: sessionId.current, eventType, progressPercent, watchedSeconds, referrer: document.referrer }) });
  };

  useEffect(() => {
    const key = `prisma-player-session:${playerId}`;
    let stored = trackingSessionId || window.localStorage.getItem(key);
    if (!stored) { stored = crypto.randomUUID(); window.localStorage.setItem(key, stored); }
    sessionId.current = stored;
    const declaredSite = new URLSearchParams(window.location.search).get("site") ?? "";
    fetch(`/api/embed/${encodeURIComponent(playerId)}?site=${encodeURIComponent(declaredSite || document.referrer)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error(String(response.status)); return response.json() as Promise<Payload>; })
      .then(setPayload)
      .catch((reason: Error) => setError(reason.message === "403" ? "Este domínio não está autorizado a exibir o player." : "Player não encontrado ou ainda não publicado."));
  }, [playerId, trackingSessionId]);

  useEffect(() => {
    if (payload) trackAnalytics("impression");
  // trackAnalytics intentionally follows payload availability once per embed session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

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

  useEffect(() => {
    if (window.parent === window) return;
    const publishSize = () => window.parent.postMessage({ type: "prisma-player:resize", playerId, height: Math.ceil(document.documentElement.scrollHeight) }, "*");
    const observer = new ResizeObserver(publishSize);
    observer.observe(document.body);
    publishSize();
    return () => observer.disconnect();
  }, [playerId]);

  if (error) return <main className="grid min-h-dvh place-items-center bg-black p-6 text-center text-sm text-white/70">{error}</main>;
  if (!payload) return <main className="grid min-h-dvh place-items-center bg-black text-white/60"><span className="animate-pulse">Carregando player…</span></main>;

  const c = payload.config;
  const style = { "--player-accent": String(c.progressColor ?? c.accent ?? "#0066cc"), "--player-progress-height": `${Number(c.progressHeight ?? 6)}px`, borderRadius: `${Number(c.radius ?? 0)}px` } as CSSProperties;
  const assetUrls = c.assetUrls && typeof c.assetUrls === "object" ? c.assetUrls as Record<string, string> : {};
  const actualProgress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const smartProgress = actualProgress >= 1 ? 100 : Math.min(99.5, (1 - Math.pow(1 - actualProgress, 2.4)) * 100);
  const rawCtaUrl = String(c.ctaUrl ?? "");
  const safeCtaUrl = /^https?:\/\//i.test(rawCtaUrl) ? rawCtaUrl : "";
  const resumeStorageKey = `prisma-resume:${payload.videoId}`;
  const smartAutoplay = Boolean(c.smartAutoplay);
  const resumeEnabled = Boolean(c.resumeEnabled);
  const thumbnailEnabled = Boolean(c.thumbnailEnabled);
  const playerClasses = `prisma-player--embed ${Boolean(c.smartProgress) ? "prisma-player--smart-progress" : ""} ${c.playPause === false ? "prisma-player--play-pause-hidden" : ""} ${c.fullscreenDesktop === false ? "prisma-player--fullscreen-desktop-hidden" : ""} ${c.fullscreenMobile === false ? "prisma-player--fullscreen-mobile-hidden" : ""}`;

  const responsiveStyle = videoRatio
    ? { ...style, width: `min(100%, calc(100dvh * ${videoRatio}))` }
    : style;

  return <main className="flex min-h-0 select-none justify-center bg-transparent" onContextMenu={(event) => event.preventDefault()}>
    <div className="w-full" style={responsiveStyle}>
      {Boolean(c.headlineEnabled) && <h1 className="mb-4 text-center text-[clamp(18px,4vw,30px)] font-semibold text-white">{String(c.headline ?? "")}</h1>}
      <div className="relative overflow-hidden" style={{ borderRadius: `${Number(c.radius ?? 0)}px`, aspectRatio: videoRatio ? String(videoRatio) : undefined }}>
        <VideoPlayer className={playerClasses} sources={[{ src: payload.source, type: payload.type }]} poster={thumbnailEnabled && !smartAutoplay ? assetUrls.thumbnailStart : undefined} textTracks={Boolean(c.captionsEnabled) && assetUrls.captions ? [{ src: assetUrls.captions, kind: "subtitles", label: String(c.captionName || "Legendas"), srclang: "pt-BR", default: true }] : []} autoplay={smartAutoplay && resumeChecked && resumePoint === null && !autoplayActivated} muted={Boolean(c.muted) || (smartAutoplay && !autoplayActivated)} loop={Boolean(c.loop)} playbackRate={Number(c.playbackRate ?? 1)} bigPlayButton={c.bigPlay !== false} pauseWhenHidden={Boolean(c.smartPause)} startTime={startTime} restartWithSoundSignal={restartWithSoundSignal} resumePlaybackSignal={resumePlaybackSignal} onPlay={() => { track("play", 0, currentTime); trackAnalytics("play", 0, currentTime); setThumbnailOverlay(null); }} onPause={() => { if (thumbnailEnabled && assetUrls.thumbnailPause && currentTime > 0 && currentTime < duration) setThumbnailOverlay("pause"); }} onEnded={() => { track("complete", 100, duration); trackAnalytics("complete", 100, duration); if (!Boolean(c.loop)) localStorage.removeItem(resumeStorageKey); if (thumbnailEnabled && assetUrls.thumbnailEnd) setThumbnailOverlay("end"); }} onTimeUpdate={(time) => { setCurrentTime(time); if (resumeEnabled && time > 0) localStorage.setItem(resumeStorageKey, String(Math.floor(time))); if (duration > 0) [10, 25, 50, 75, 90].forEach((point) => { if (time / duration * 100 >= point) { if ([25, 50, 75].includes(point)) track("progress", point, time); trackAnalytics("progress", point, time); } }); }} onLoadedMetadata={(metadata) => { setDuration(metadata.duration); if (metadata.width > 0 && metadata.height > 0) setVideoRatio(metadata.width / metadata.height); if (resumeEnabled) { const saved = Number(localStorage.getItem(resumeStorageKey)); if (Number.isFinite(saved) && saved >= 5 && saved < metadata.duration - 5) setResumePoint(saved); } setResumeChecked(true); }} controlVisibility={{ progressControl: !Boolean(c.smartProgress) && c.progressBar !== false, currentTimeDisplay: c.time !== false, durationDisplay: c.time !== false, volumePanel: c.volume !== false, fullscreenToggle: c.fullscreen !== false, pictureInPictureToggle: c.pictureInPicture !== false, playbackRateMenuButton: c.speedControl !== false }} />
        {resumePoint !== null && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-5 text-center text-white backdrop-blur-sm"><div><p className="mb-4 text-[16px] font-semibold">{String(c.resumeMessage || "Você já começou a assistir este vídeo")}</p><div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => { setStartTime(resumePoint); setResumePoint(null); setAutoplayActivated(true); setResumePlaybackSignal((value) => value + 1); }} className="min-h-11 rounded-full bg-white px-5 text-[13px] font-semibold text-black">Continuar em {Math.floor(resumePoint / 60)}:{String(Math.floor(resumePoint % 60)).padStart(2, "0")}</button><button type="button" onClick={() => { localStorage.removeItem(resumeStorageKey); setStartTime(0); setResumePoint(null); setAutoplayActivated(true); setRestartWithSoundSignal((value) => value + 1); }} className="min-h-11 rounded-full border border-white/30 px-5 text-[13px] font-semibold">Assistir do início</button></div></div></div>}
        {smartAutoplay && resumeChecked && !autoplayActivated && resumePoint === null && <button type="button" onClick={() => { setStartTime(0); setAutoplayActivated(true); setRestartWithSoundSignal((value) => value + 1); }} className="absolute left-1/2 top-1/2 z-30 w-[min(240px,80%)] -translate-x-1/2 -translate-y-1/2 rounded-[11px] border border-white/40 px-5 py-3 text-center text-[13px] font-semibold text-white backdrop-blur-md" style={{ backgroundColor: `${String(c.accent ?? "#0066cc")}dd` }}>{String(c.autoplayMessage || "Seu vídeo já começou. Clique para ouvir.")}</button>}
        {Boolean(c.smartProgress) && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-transparent" style={{ height: `${Math.max(Number(c.progressHeight ?? 6), 4)}px` }}><div className="h-full transition-[width] duration-300 ease-out" style={{ width: `${smartProgress}%`, backgroundColor: String(c.progressColor ?? c.accent ?? "#0066cc") }} /></div>}
        {Boolean(c.miniHooksEnabled) && currentTime >= Number(c.miniHookStart ?? 0) && currentTime < Number(c.miniHookStart ?? 0) + Number(c.miniHookDuration ?? 6) && <div className="pointer-events-none absolute inset-x-4 top-4 z-20 mx-auto max-w-[520px] rounded-[11px] bg-black/70 px-4 py-3 text-center text-[14px] font-semibold text-white shadow-lg backdrop-blur-md">{String(c.miniHookText || "Continue assistindo")}</div>}
        {thumbnailOverlay && <button type="button" onClick={() => { const paused = thumbnailOverlay === "pause"; setThumbnailOverlay(null); if (paused) setResumePlaybackSignal((value) => value + 1); else setRestartWithSoundSignal((value) => value + 1); }} className="absolute inset-0 z-50 bg-cover bg-center" style={{ backgroundImage: `url(${thumbnailOverlay === "pause" ? assetUrls.thumbnailPause : assetUrls.thumbnailEnd})` }} aria-label={thumbnailOverlay === "pause" ? "Continuar vídeo" : "Assistir novamente"}><span className="absolute inset-0 grid place-items-center bg-black/20"><span className="rounded-full bg-black/70 px-5 py-3 text-[13px] font-semibold text-white backdrop-blur-md">{thumbnailOverlay === "pause" ? "Continuar assistindo" : "Assistir novamente"}</span></span></button>}
      </div>
      {Boolean(c.ctaEnabled) && currentTime >= Number(c.ctaStart ?? 0) && safeCtaUrl && <a href={safeCtaUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalytics("cta_click", 0, currentTime)} className="mx-auto mt-4 flex min-h-12 w-fit items-center justify-center rounded-full px-7 text-[16px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]" style={{ backgroundColor: String(c.accent ?? "#0066cc") }}>{String(c.ctaText ?? "Quero aproveitar agora")}</a>}
    </div>
  </main>;
}
