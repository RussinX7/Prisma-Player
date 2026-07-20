"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Captions, Check, Clock3, Code2, FastForward, Gauge, Globe2, Heading, ImageIcon, LockKeyhole, Maximize, MonitorPlay, MousePointerClick, Palette, PauseCircle, PictureInPicture2, Play, Radio, Rewind, RotateCcw, Save, Shield, Subtitles, TimerReset, Trash2, Volume2, X, Zap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Dialog from "@/components/ui/Dialog";
import { VideoPlayer } from "@/features/player/components";
import { createClient } from "@/lib/supabase/client";

interface StoredVideo { id?: string; name: string; src: string; type: string }
type ModuleId = "style" | "progress" | "autoplay" | "turbo" | "headlines" | "hooks" | "traffic" | "actions" | "thumbnail" | "resume" | "pixels" | "captions" | "protection" | "playback";

interface StudioConfig {
  accent: string; background: string; gradientEnd: string; colorStyle: "solid" | "gradient"; radius: number; bigPlay: boolean; playPause: boolean; disablePause: boolean; progressBar: boolean; time: boolean; seekBackward: boolean; seekForward: boolean; volume: boolean; fullscreen: boolean; pictureInPicture: boolean; speedControl: boolean;
  smartProgress: boolean; progressColor: string; progressHeight: number; smartAutoplay: boolean; autoplayMessage: string; autoplayTextColor: string; autoplayBackground: string; autoplayRadius: number; turboMode: "automatic" | "manual"; turboMin: number; turboMax: number; playbackRate: number;
  headlineEnabled: boolean; headline: string; headlineVariants: string[]; headlineFormat: "text" | "image"; headlineDesktopName: string; headlineMobileName: string; headlineColor: string; headlineBackground: string; headlineSize: number; headlineAlign: "left" | "center" | "right"; trafficEnabled: boolean; domains: string[]; browserLanguage: string; allowedCountries: string; allowedDevices: string[]; blockVpn: boolean; urlKeyEnabled: boolean; accessToken: boolean;
  miniHooksEnabled: boolean; miniHookText: string; miniHookStart: number; miniHookDuration: number; miniHookTextColor: string; miniHookBackground: string; miniHookCounterColor: string; miniHookSize: number; miniHookRadius: number; miniHookAlign: "left" | "center" | "right";
  ctaEnabled: boolean; ctaText: string; ctaUrl: string; ctaStart: number; ctaEnd: number; ctaNewTab: boolean; ctaPersist: boolean; ctaAutoScroll: boolean; ctaTextColor: string; ctaHoverTextColor: string; ctaBackground: string; ctaHoverBackground: string; ctaFontSize: number; ctaRadius: number; ctaPaddingY: number; ctaPaddingX: number; ctaPulse: boolean; ctaShadow: boolean; thumbnailEnabled: boolean; resumeEnabled: boolean; resumeMessage: string;
  thumbnailStartName: string; thumbnailPauseName: string; thumbnailEndName: string;
  pixelsEnabled: boolean; pixelProvider: string; pixelName: string; pixelId: string; captionsEnabled: boolean; captionName: string;
  loop: boolean; muted: boolean; smartPause: boolean; fullscreenDesktop: boolean; fullscreenMobile: boolean; antiDownload: boolean; videoDuration: number; aspectRatio: number;
  assets: Record<string, string>;
}

const rates = [0.75, 1, 1.25, 1.5, 2];
const modules: Array<{ id: ModuleId; label: string; icon: typeof Palette; status?: keyof StudioConfig; badge?: string }> = [
  { id: "style", label: "Estilo", icon: Palette },
  { id: "progress", label: "Progresso inteligente", icon: Gauge, status: "smartProgress" },
  { id: "autoplay", label: "Smart Autoplay", icon: Play, status: "smartAutoplay" },
  { id: "turbo", label: "Turbo", icon: Zap, badge: "Teste" },
  { id: "headlines", label: "Headlines", icon: Heading, status: "headlineEnabled" },
  { id: "hooks", label: "Mini-ganchos", icon: Zap, status: "miniHooksEnabled", badge: "Novo" },
  { id: "traffic", label: "Filtro de tráfego", icon: Shield, status: "trafficEnabled", badge: "Novo" },
  { id: "actions", label: "Botões de ação", icon: MousePointerClick, status: "ctaEnabled" },
  { id: "thumbnail", label: "ThumbSniper", icon: ImageIcon, status: "thumbnailEnabled" },
  { id: "resume", label: "Continuar assistindo", icon: RotateCcw, status: "resumeEnabled" },
  { id: "pixels", label: "Pixels", icon: Radio, status: "pixelsEnabled" },
  { id: "captions", label: "Legendas", icon: Captions, status: "captionsEnabled" },
  { id: "protection", label: "Anti-download", icon: LockKeyhole, status: "antiDownload", badge: "Proteção" },
  { id: "playback", label: "Opções de reprodução", icon: TimerReset },
];

const initialConfig: StudioConfig = {
  accent: "#0066cc", background: "#000000", gradientEnd: "#2997ff", colorStyle: "solid", radius: 0, bigPlay: true, playPause: true, disablePause: false, progressBar: true, time: true, seekBackward: false, seekForward: false, volume: true, fullscreen: true, pictureInPicture: true, speedControl: true,
  smartProgress: true, progressColor: "#0066cc", progressHeight: 6, smartAutoplay: true, autoplayMessage: "Seu vídeo já começou. Clique para ouvir.", autoplayTextColor: "#ffffff", autoplayBackground: "#0066cc", autoplayRadius: 12, turboMode: "manual", turboMin: 1, turboMax: 1.2, playbackRate: 1,
  headlineEnabled: true, headline: "Descubra a maneira mais simples de transformar atenção em vendas", headlineVariants: [], headlineFormat: "text", headlineDesktopName: "", headlineMobileName: "", headlineColor: "#1d1d1f", headlineBackground: "#ffffff", headlineSize: 30, headlineAlign: "center", trafficEnabled: false, domains: [], browserLanguage: "Todos", allowedCountries: "Todos", allowedDevices: ["desktop", "mobile", "tablet"], blockVpn: true, urlKeyEnabled: false, accessToken: false,
  miniHooksEnabled: false, miniHookText: "Continue assistindo — a parte mais importante está chegando.", miniHookStart: 30, miniHookDuration: 6, miniHookTextColor: "#ffffff", miniHookBackground: "#111111", miniHookCounterColor: "#ff3b30", miniHookSize: 16, miniHookRadius: 10, miniHookAlign: "center",
  ctaEnabled: false, ctaText: "Quero aproveitar agora", ctaUrl: "https://", ctaStart: 60, ctaEnd: 0, ctaNewTab: true, ctaPersist: true, ctaAutoScroll: false, ctaTextColor: "#ffffff", ctaHoverTextColor: "#ffffff", ctaBackground: "#0066cc", ctaHoverBackground: "#0055aa", ctaFontSize: 18, ctaRadius: 12, ctaPaddingY: 12, ctaPaddingX: 24, ctaPulse: false, ctaShadow: true, thumbnailEnabled: false, resumeEnabled: true, resumeMessage: "Você já começou a assistir este vídeo",
  thumbnailStartName: "", thumbnailPauseName: "", thumbnailEndName: "",
  pixelsEnabled: false, pixelProvider: "Meta", pixelName: "", pixelId: "", captionsEnabled: false, captionName: "",
  loop: false, muted: false, smartPause: true, fullscreenDesktop: true, fullscreenMobile: true, antiDownload: true, videoDuration: 0, aspectRatio: 16 / 9,
  assets: {},
};

export default function VslStudio() {
  const router = useRouter();
  const [video] = useState<StoredVideo | null>(() => { if (typeof window === "undefined") return null; try { return JSON.parse(sessionStorage.getItem("prisma-mvp-video") ?? "null") as StoredVideo | null; } catch { return null; } });
  const [active, setActiveState] = useState<ModuleId | null>(null);
  const [config, setConfig] = useState<StudioConfig>(() => {
    if (typeof window === "undefined") return initialConfig;
    try { return { ...initialConfig, ...JSON.parse(localStorage.getItem("prisma-studio-config") ?? "{}") as Partial<StudioConfig> }; }
    catch { return initialConfig; }
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 16, height: 9 });
  const [startTime, setStartTime] = useState(0);
  const [resumePoint, setResumePoint] = useState<number | null>(null);
  const [autoplayActivated, setAutoplayActivated] = useState(false);
  const [restartWithSoundSignal, setRestartWithSoundSignal] = useState(0);
  const [resumePlaybackSignal, setResumePlaybackSignal] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [playerId, setPlayerId] = useState<string>();
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>();
  const [pausePosterUrl, setPausePosterUrl] = useState<string>();
  const [endPosterUrl, setEndPosterUrl] = useState<string>();
  const [headlineDesktopUrl, setHeadlineDesktopUrl] = useState<string>();
  const [headlineMobileUrl, setHeadlineMobileUrl] = useState<string>();
  const [thumbnailOverlay, setThumbnailOverlay] = useState<"pause" | "end" | null>(null);
  const [posterPreviewActive, setPosterPreviewActive] = useState(false);
  const [captionTrack, setCaptionTrack] = useState<{ src: string; kind: "subtitles"; label: string; srclang: string; default: boolean }>();
  const [assetFiles, setAssetFiles] = useState<Partial<Record<"thumbnailStart" | "thumbnailPause" | "thumbnailEnd" | "headlineDesktop" | "headlineMobile" | "captions", File>>>({});
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [previewStageSize, setPreviewStageSize] = useState({ width: 0, height: 0 });
  const dirtyConfigKeys = useRef(new Set<keyof StudioConfig>());
  useEffect(() => {
    const receiveHeadlineFile = (event: Event) => {
      const detail = (event as CustomEvent<{ viewport: "desktop" | "mobile"; file: File }>).detail;
      if (!detail?.file || !["desktop", "mobile"].includes(detail.viewport)) return;
      const url = URL.createObjectURL(detail.file);
      if (detail.viewport === "desktop") {
        setHeadlineDesktopUrl(url);
        setAssetFiles((items) => ({ ...items, headlineDesktop: detail.file }));
      } else {
        setHeadlineMobileUrl(url);
        setAssetFiles((items) => ({ ...items, headlineMobile: detail.file }));
      }
    };
    window.addEventListener("prisma:headline-file", receiveHeadlineFile);
    return () => window.removeEventListener("prisma:headline-file", receiveHeadlineFile);
  }, []);
  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setPreviewStageSize((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const sources = useMemo(() => video ? [{ src: video.src, type: video.type }] : [], [video]);
  const controlVisibility = useMemo(() => ({ progressControl: config.progressBar && !config.smartProgress, currentTimeDisplay: config.time, durationDisplay: config.time, seekBackward: config.seekBackward, seekForward: config.seekForward, volumePanel: config.volume, fullscreenToggle: config.fullscreen, pictureInPictureToggle: config.pictureInPicture, playbackRateMenuButton: config.speedControl }), [config.progressBar, config.smartProgress, config.time, config.seekBackward, config.seekForward, config.volume, config.fullscreen, config.pictureInPicture, config.speedControl]);
  const playerStyle = { "--player-accent": config.smartProgress ? config.progressColor : config.accent, "--player-progress-height": `${config.progressHeight}px`, borderRadius: `${config.radius}px`, background: "transparent" } as CSSProperties;
  const resumeStorageKey = `prisma-resume:${video?.id ?? video?.name ?? "preview"}`;
  const lastPersistedSecond = useRef(-1);
  const injectedResumePreview = useRef(false);
  const previewRatio = videoSize.width > 0 && videoSize.height > 0 ? videoSize.width / videoSize.height : 16 / 9;
  const availablePreviewWidth = previewStageSize.width || (previewRatio < 0.9 ? 360 : 720);
  // Reserva apenas a linha de metadados. Headline, CTA e demais acessórios
  // ficam fora deste cálculo e nunca reduzem nem deformam o vídeo.
  const availablePreviewHeight = previewStageSize.height > 0 ? Math.max(1, previewStageSize.height - 32) : (previewRatio < 0.9 ? 520 : 405);
  const fittedPreviewWidth = Math.max(1, Math.min(availablePreviewWidth, availablePreviewHeight * previewRatio, 860));
  const previewStyle = {
    ...playerStyle,
    aspectRatio: `${videoSize.width} / ${videoSize.height}`,
    width: `${fittedPreviewWidth}px`,
    height: `${fittedPreviewWidth / previewRatio}px`,
    flex: "0 0 auto",
  } as CSSProperties;
  const actualProgress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  // Avança rapidamente no início e desacelera perto do fim, sem nunca concluir antes do vídeo.
  const smartProgress = actualProgress >= 1 ? 100 : Math.min(99.5, (1 - Math.pow(1 - actualProgress, 2.4)) * 100);
  const update = <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => {
    dirtyConfigKeys.current.add(key);
    setConfig((current) => ({ ...current, [key]: value }));
  };
  const setActive = (module: ModuleId | null) => {
    setActiveState(module);
    setThumbnailOverlay(null);
    if (module === "autoplay") setAutoplayActivated(false);
    if (module === "resume" && config.resumeEnabled && resumePoint === null) { injectedResumePreview.current = true; setResumePoint(Math.max(5, Math.min(duration * 0.35 || 15, Math.max(duration - 1, 15)))); }
    else if (injectedResumePreview.current) { injectedResumePreview.current = false; setResumePoint(null); }
    if (module === "hooks") setStartTime(config.miniHookStart);
    if (module === "actions") setStartTime(config.ctaStart);
  };

  useEffect(() => {
    if (!video?.id) return;
    let activeRequest = true;
    fetch(`/api/player-configs?videoId=${encodeURIComponent(video.id)}`).then((response) => response.ok ? response.json() : null).then(async (payload: { playerConfig?: { id?: string; config?: Partial<StudioConfig> } } | null) => {
      if (!activeRequest || !payload?.playerConfig) return;
      if (payload.playerConfig.id) setPlayerId(payload.playerConfig.id);
      if (payload.playerConfig.config) {
        const loaded = { ...initialConfig, ...payload.playerConfig.config };
        setConfig((current) => {
          const merged = { ...loaded };
          for (const key of dirtyConfigKeys.current) Object.assign(merged, { [key]: current[key] });
          return merged;
        });
        const assets = loaded.assets ?? {};
        const supabase = createClient();
        const signed = await Promise.all(Object.entries(assets).map(async ([kind, path]) => {
          const { data } = await supabase.storage.from("player-assets").createSignedUrl(path, 3600);
          return [kind, data?.signedUrl] as const;
        }));
        if (!activeRequest) return;
        for (const [kind, url] of signed) {
          if (!url) continue;
          if (kind === "thumbnailStart") setPosterUrl(url);
          if (kind === "thumbnailPause") setPausePosterUrl(url);
          if (kind === "thumbnailEnd") setEndPosterUrl(url);
          if (kind === "headlineDesktop") setHeadlineDesktopUrl(url);
          if (kind === "headlineMobile") setHeadlineMobileUrl(url);
          if (kind === "captions") setCaptionTrack({ src: url, kind: "subtitles", label: loaded.captionName || "Legendas", srclang: "pt-BR", default: true });
        }
      }
    }).catch(() => undefined);
    return () => { activeRequest = false; };
  }, [video?.id]);

  async function save(): Promise<string | undefined> {
    if (saving) return playerId;
    setSaving(true);
    setSaveError("");
    let publishedPlayerId = playerId;
    let persistedConfig = config;
    if (video?.id) {
      if (Object.keys(assetFiles).length > 0) {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) { setSaveError("Sua sessão expirou."); setSaving(false); return; }
        const assets = { ...config.assets };
        for (const [kind, file] of Object.entries(assetFiles)) {
          if (!file) continue;
          const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
          const path = `${userData.user.id}/${video.id}/${kind}-${crypto.randomUUID()}.${extension}`;
          const { data, error } = await supabase.storage.from("player-assets").upload(path, file, { contentType: file.type || undefined, cacheControl: "31536000", upsert: false });
          if (error || !data) { setSaveError(`Não foi possível enviar ${file.name}.`); setSaving(false); return; }
          assets[kind] = data.path;
        }
        persistedConfig = { ...config, assets };
        setConfig(persistedConfig);
        setAssetFiles({});
      }
      const response = await fetch("/api/player-configs", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: video.id, config: persistedConfig, domains: persistedConfig.domains }) });
      if (!response.ok) { setSaveError("Não foi possível salvar no Supabase."); setSaving(false); return; }
      const payload = await response.json() as { playerConfig?: { id?: string } };
      if (payload.playerConfig?.id) { publishedPlayerId = payload.playerConfig.id; setPlayerId(payload.playerConfig.id); }
    }
    localStorage.setItem("prisma-studio-config", JSON.stringify(persistedConfig));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
    return publishedPlayerId;
  }

  async function removeVsl() {
    if (!video?.id || deleting) return;
    if (!deleteConfirmOpen) { setDeleteConfirmOpen(true); return; }
    setDeleting(true);
    const response = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
    if (!response.ok) { setDeleting(false); setSaveError("Não foi possível apagar a VSL."); return; }
    setDeleteConfirmOpen(false);
    sessionStorage.removeItem("prisma-mvp-video");
    router.replace("/dashboard/videos");
  }


  function handleMetadata(metadata: { duration: number; width: number; height: number }) {
    setDuration(metadata.duration);
    setConfig((current) => ({ ...current, videoDuration: metadata.duration, aspectRatio: metadata.width > 0 && metadata.height > 0 ? metadata.width / metadata.height : current.aspectRatio, ctaStart: Math.min(current.ctaStart, Math.max(0, Math.floor(metadata.duration))) }));
    if (metadata.width > 0 && metadata.height > 0) setVideoSize({ width: metadata.width, height: metadata.height });
    if (!config.resumeEnabled) return;
    const savedPoint = Number(localStorage.getItem(resumeStorageKey));
    if (Number.isFinite(savedPoint) && savedPoint >= 5 && savedPoint < metadata.duration - 5) setResumePoint(savedPoint);
  }

  function handleTimeUpdate(time: number) {
    setCurrentTime(time);
    const second = Math.floor(time);
    if (config.resumeEnabled && second !== lastPersistedSecond.current && second > 0) {
      lastPersistedSecond.current = second;
      localStorage.setItem(resumeStorageKey, String(second));
    }
  }

  function handlePoster(file: File, kind: "start" | "pause" | "end") {
    const nextUrl = URL.createObjectURL(file);
    if (kind === "start") {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
      setPosterUrl(nextUrl);
      setPosterPreviewActive(true);
      setAssetFiles((items) => ({ ...items, thumbnailStart: file }));
    } else if (kind === "pause") {
      if (pausePosterUrl) URL.revokeObjectURL(pausePosterUrl);
      setPausePosterUrl(nextUrl);
      setAssetFiles((items) => ({ ...items, thumbnailPause: file }));
    } else {
      if (endPosterUrl) URL.revokeObjectURL(endPosterUrl);
      setEndPosterUrl(nextUrl);
      setAssetFiles((items) => ({ ...items, thumbnailEnd: file }));
    }
  }

  function handleCaption(file: File) {
    if (captionTrack) URL.revokeObjectURL(captionTrack.src);
    setCaptionTrack({ src: URL.createObjectURL(file), kind: "subtitles", label: file.name, srclang: "pt-BR", default: true });
    setAssetFiles((items) => ({ ...items, captions: file }));
  }

  return <div className="h-dvh overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#1d1d1f] dark:text-white">
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-black/10 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/85 sm:px-6">
      <div className="flex min-w-0 items-center gap-4"><BrandLogo className="hidden h-8 w-[154px] sm:inline-block" /><div className="hidden h-7 w-px bg-black/10 dark:bg-white/10 sm:block" /><div className="min-w-0"><p className="text-[12px] text-[#7a7a7a]">Studio Prisma</p><h1 className="truncate text-[15px] font-semibold">{video?.name ?? "Personalizador de VSL"}</h1></div></div>
      <div className="flex shrink-0 items-center gap-2">{saveError && <span className="hidden text-[12px] text-red-500 md:inline">{saveError}</span>}{video?.id && <button type="button" onClick={() => void removeVsl()} disabled={deleting} title="Apagar VSL definitivamente" className="flex min-h-11 items-center gap-2 rounded-full px-3 text-red-500 hover:bg-red-500/10 disabled:opacity-40"><Trash2 size={17} /><span className="hidden xl:inline">{deleting ? "Apagando…" : "Apagar"}</span></button>}<button type="button" disabled={saving} onClick={() => void save().then((id) => { if (id) setEmbedOpen(true); else setSaveError("Não foi possível publicar o player."); })} className="flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-4 text-[14px] disabled:opacity-50 dark:border-white/15"><Code2 size={16} /><span className="hidden sm:inline">{saving ? "Publicando…" : "Embed"}</span></button><button type="button" onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-full bg-[#0066cc] px-5 text-[14px] text-white">{saved ? <Check size={16} /> : <Save size={16} />}{saved ? "Salvo" : "Salvar"}</button></div>
    </header>

    <div className="grid h-[calc(100dvh-64px)] min-h-0 grid-cols-1 grid-rows-[58px_minmax(0,1fr)_150px] overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)_180px]">
      <StudioToolRail active={active} config={config} onSelect={setActive} />
      <aside className="order-3 hidden min-h-0 overflow-hidden border-l border-black/10 bg-white dark:border-white/10 dark:bg-[#272729] lg:block">
        <div className="h-full overflow-y-auto overscroll-contain p-4">
          <ModulePanel module={active ?? "style"} config={config} update={update} onPoster={handlePoster} onCaption={handleCaption} />
        </div>
      </aside>

      {active && <aside className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-hidden bg-white/98 backdrop-blur-xl dark:bg-[#1d1d1f]/98 lg:hidden">
        <div className="flex h-14 items-center justify-between border-b border-black/10 px-4 dark:border-white/10"><strong className="text-[14px]">Configurar {modules.find((item) => item.id === active)?.label}</strong><button type="button" onClick={() => setActiveState(null)} className="grid h-10 w-10 place-items-center rounded-full bg-black/5 dark:bg-white/10" aria-label="Fechar configurações"><X size={18} /></button></div>
        <div className="h-[calc(100%-56px)] overflow-y-auto overscroll-contain p-4"><ModulePanel module={active} config={config} update={update} onPoster={handlePoster} onCaption={handleCaption} /></div>
      </aside>}

      <main className="order-2 flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f5f5f7] p-3 text-[#1d1d1f] dark:bg-black dark:text-white sm:p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] text-black/50 dark:text-white/50">Prévia ao vivo</p><p className="text-[14px] font-semibold">{active ? modules.find((item) => item.id === active)?.label : "Visão geral"}</p></div><span className="rounded-full bg-black/5 px-3 py-2 text-[12px] dark:bg-white/10">{config.playbackRate.toFixed(2)}x</span></div>
        <div ref={previewStageRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent p-2 sm:p-3">
          <div className="flex min-h-full w-full flex-col items-center">
            {config.headlineEnabled && <HeadlinePreview config={config} desktopUrl={headlineDesktopUrl} mobileUrl={headlineMobileUrl} />}
            <div className="flex w-full shrink-0 items-center justify-center overflow-hidden" style={{ height: `${availablePreviewHeight}px` }}>
            {video ? <div style={previewStyle} className="relative overflow-hidden"><VideoPlayer key={`${posterUrl ?? "video-without-poster"}-${config.smartAutoplay}-${active === "thumbnail"}`} className={`${config.smartProgress ? "prisma-player--smart-progress" : ""} ${config.playPause ? "" : "prisma-player--play-pause-hidden"} ${config.fullscreenDesktop ? "" : "prisma-player--fullscreen-desktop-hidden"} ${config.fullscreenMobile ? "" : "prisma-player--fullscreen-mobile-hidden"}`} sources={sources} poster={config.thumbnailEnabled && !config.smartAutoplay ? posterUrl : undefined} textTracks={config.captionsEnabled && captionTrack ? [captionTrack] : []} autoplay={config.smartAutoplay && resumePoint === null && !posterPreviewActive} muted={config.muted || (config.smartAutoplay && !autoplayActivated)} controls playbackRate={config.playbackRate} playbackRates={rates} loop={config.loop} bigPlayButton={config.bigPlay} pauseWhenHidden={config.smartPause} startTime={startTime} restartWithSoundSignal={restartWithSoundSignal} resumePlaybackSignal={resumePlaybackSignal} controlVisibility={controlVisibility} onLoadedMetadata={handleMetadata} onTimeUpdate={handleTimeUpdate} onPause={() => { if (config.thumbnailEnabled && pausePosterUrl && currentTime > 0 && currentTime < duration) setThumbnailOverlay("pause"); }} onPlay={() => setThumbnailOverlay(null)} onEnded={() => { if (!config.loop) localStorage.removeItem(resumeStorageKey); if (config.thumbnailEnabled && endPosterUrl) setThumbnailOverlay("end"); }} />
              {resumePoint !== null && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-5 text-center text-white backdrop-blur-sm"><div><p className="mb-4 text-[16px] font-semibold">{config.resumeMessage}</p><div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => { setStartTime(resumePoint); setResumePoint(null); setAutoplayActivated(true); }} className="min-h-11 rounded-full bg-white px-5 text-[13px] font-semibold text-black">Continuar em {Math.floor(resumePoint / 60)}:{String(Math.floor(resumePoint % 60)).padStart(2, "0")}</button><button type="button" onClick={() => { localStorage.removeItem(resumeStorageKey); setStartTime(0); setResumePoint(null); }} className="min-h-11 rounded-full border border-white/30 px-5 text-[13px] font-semibold">Assistir do início</button></div></div></div>}
              {config.smartAutoplay && !autoplayActivated && resumePoint === null && <button type="button" onClick={() => { setStartTime(0); setPosterPreviewActive(false); setAutoplayActivated(true); setRestartWithSoundSignal((value) => value + 1); }} className="absolute left-1/2 top-1/2 z-10 w-[min(240px,80%)] -translate-x-1/2 -translate-y-1/2 border border-white/40 px-5 py-3 text-center text-[13px] font-semibold backdrop-blur-md" style={{ color: config.autoplayTextColor, backgroundColor: config.autoplayBackground, borderRadius: `${config.autoplayRadius}px` }}>{config.autoplayMessage}</button>}
              {config.smartProgress && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-transparent" style={{ height: `${Math.max(config.progressHeight, 4)}px` }} aria-hidden="true"><div className="h-full transition-[width] duration-300 ease-out" style={{ width: `${smartProgress}%`, backgroundColor: config.progressColor }} /></div>}
              {config.miniHooksEnabled && (active === "hooks" || (currentTime >= config.miniHookStart && currentTime < config.miniHookStart + config.miniHookDuration)) && <div className="pointer-events-none absolute inset-x-4 top-4 z-20 mx-auto max-w-[520px] px-4 py-3 font-semibold shadow-lg backdrop-blur-md" style={{ color: config.miniHookTextColor, backgroundColor: `${config.miniHookBackground}e8`, fontSize: `${config.miniHookSize}px`, borderRadius: `${config.miniHookRadius}px`, textAlign: config.miniHookAlign }}>{config.miniHookText}</div>}
              {thumbnailOverlay && <button type="button" onClick={() => { const wasPaused = thumbnailOverlay === "pause"; setThumbnailOverlay(null); if (wasPaused) setResumePlaybackSignal((value) => value + 1); else setRestartWithSoundSignal((value) => value + 1); }} className="absolute inset-0 z-40 bg-cover bg-center" style={{ backgroundImage: `url(${thumbnailOverlay === "pause" ? pausePosterUrl : endPosterUrl})` }} aria-label={thumbnailOverlay === "pause" ? "Continuar vídeo" : "Assistir novamente"}><span className="absolute inset-0 grid place-items-center bg-black/20"><span className="rounded-full bg-black/70 px-5 py-3 text-[13px] font-semibold text-white backdrop-blur-md">{thumbnailOverlay === "pause" ? "Continuar assistindo" : "Assistir novamente"}</span></span></button>}
            </div> : <div style={playerStyle} className="mx-auto flex aspect-video w-full max-w-[680px] items-center justify-center text-center text-white/50"><div><Play size={36} className="mx-auto mb-3" /><p>Importe um vídeo para testar o Studio</p></div></div>}
            </div>
            {config.ctaEnabled && (active === "actions" || (currentTime >= config.ctaStart && (!config.ctaEnd || currentTime <= config.ctaEnd))) && <a href={config.ctaUrl} target={config.ctaNewTab ? "_blank" : undefined} rel="noreferrer" className={`studio-preview-cta mx-auto mt-5 flex min-h-12 w-fit items-center font-semibold ${config.ctaPulse ? "studio-cta-pulse" : ""}`} style={{ color: config.ctaTextColor, backgroundColor: config.ctaBackground, fontSize: `${config.ctaFontSize}px`, borderRadius: `${config.ctaRadius}px`, padding: `${config.ctaPaddingY}px ${config.ctaPaddingX}px`, boxShadow: config.ctaShadow ? "0 12px 28px rgba(0,102,204,.24)" : "none", "--cta-hover-bg": config.ctaHoverBackground, "--cta-hover-color": config.ctaHoverTextColor } as CSSProperties}>{config.ctaText}</a>}
            {video && <p className="mt-3 text-center text-[11px] text-black/40 dark:text-white/40">{videoSize.width}×{videoSize.height} · {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "Lendo metadados"}</p>}
          </div>
        </div>
      </main>
      <StudioTimeline currentTime={currentTime} duration={duration} config={config} onSeek={(time) => { setCurrentTime(time); setStartTime(time); }} onSelect={setActive} />
    </div>
    <Dialog open={deleteConfirmOpen} onClose={() => { if (!deleting) setDeleteConfirmOpen(false); }} title="Excluir esta VSL definitivamente?" description="Confirme apenas se você realmente deseja remover todo o conteúdo." size="sm" footer={<><button type="button" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} className="min-h-11 rounded-full border px-5 themeable-border-hairline themeable-text-ink">Cancelar</button><button type="button" onClick={() => void removeVsl()} disabled={deleting} className="min-h-11 rounded-full bg-red-600 px-5 text-white disabled:opacity-60">{deleting ? "Excluindo…" : "Sim, excluir tudo"}</button></>}><div className="rounded-[14px] bg-red-500/10 p-4 text-[14px] leading-relaxed text-red-600">O vídeo original, o player publicado, as thumbnails, legendas e todas as configurações serão removidos sem possibilidade de recuperação.</div></Dialog>
    {(saving || saved || deleting) && <div role="status" className="fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 animate-status-pop rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#1d1d1f] shadow-2xl dark:bg-[#2c2c2e] dark:text-white">{deleting ? "Excluindo VSL…" : saving ? "Salvando alterações…" : "VSL salva com sucesso"}</div>}
    <EmbedDialog open={embedOpen} onClose={() => setEmbedOpen(false)} playerId={playerId} ratio={previewRatio} />
  </div>;
}

function EmbedDialog({ open, onClose, playerId, ratio }: { open: boolean; onClose: () => void; playerId?: string; ratio: number }) {
  const [format, setFormat] = useState<"javascript" | "iframe">("javascript");
  const [responsive, setResponsive] = useState(false);
  const [mobileId, setMobileId] = useState("");
  const [copied, setCopied] = useState<"embed" | "speed" | null>(null);
  const id = playerId ?? "player-nao-publicado";
  const origin = typeof window === "undefined" ? "https://prisma-player.vercel.app" : window.location.origin;
  const padding = `${(100 / Math.max(ratio, 0.1)).toFixed(4)}%`;
  const iframe = `<iframe src="${origin}/embed/${id}" title="Prisma Player" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:${ratio.toFixed(4)};border:0;display:block"></iframe>`;
  const mobileAttribute = responsive && mobileId ? ` data-mobile-player="${mobileId}"` : "";
  const javascript = `<prisma-player data-prisma-player="${id}"${mobileAttribute} data-title="Prisma Player" style="display:block;margin:0 auto;width:100%;position:relative;padding-top:${padding};background:transparent;border:0;overflow:hidden"></prisma-player>\n<script async src="${origin}/api/player-loader/${id}?v=2" data-prisma-loader="${id}"></script>`;
  const responsiveCode = javascript;
  const embedCode = format === "iframe" ? iframe : responsiveCode;
  const speedCode = `<link rel="preconnect" href="${origin}" crossorigin>\n<link rel="dns-prefetch" href="${origin}">`;
  const copy = async (value: string, kind: "embed" | "speed") => { await navigator.clipboard.writeText(value); setCopied(kind); setTimeout(() => setCopied(null), 1500); };

  return <Dialog open={open} onClose={onClose} title="Embed" description="Incorpore o vídeo onde quiser com o player responsivo do Prisma." size="lg">
    <div className="space-y-6">
      <section className="rounded-[14px] border p-4 themeable-border-hairline"><div className="flex items-start justify-between gap-4"><div><h3 className="text-[15px] font-semibold themeable-text-ink">Vídeo responsivo</h3><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Use versões diferentes para mobile e desktop.</p></div><Switch checked={responsive} onChange={setResponsive} /></div>{responsive && <TextInput label="ID do player mobile" value={mobileId} placeholder="Cole o ID do player mobile" onChange={setMobileId} />}</section>
      <section><div className="mb-3"><h3 className="text-[15px] font-semibold themeable-text-ink">Copie o código de Embed</h3><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Use o código abaixo para inserir o vídeo diretamente no seu site.</p></div><div className="mb-3 flex w-fit rounded-full themeable-bg-surface-pearl p-1"><button type="button" onClick={() => setFormat("javascript")} className={`min-h-10 rounded-full px-4 text-[13px] ${format === "javascript" ? "bg-prisma-blue text-white" : "themeable-text-ink"}`}>Recomendado · JavaScript</button><button type="button" onClick={() => setFormat("iframe")} className={`min-h-10 rounded-full px-4 text-[13px] ${format === "iframe" ? "bg-prisma-blue text-white" : "themeable-text-ink"}`}>iFrame</button></div><pre className="max-h-64 overflow-auto rounded-[11px] bg-[#111] p-4 text-[12px] leading-relaxed text-white">{embedCode}</pre><button type="button" onClick={() => copy(embedCode, "embed")} className="mt-3 min-h-11 rounded-full bg-prisma-blue px-5 text-[14px] text-white">{copied === "embed" ? "Copiado" : "Copiar código"}</button></section>
      <section className="border-t pt-6 themeable-border-hairline"><h3 className="text-[15px] font-semibold themeable-text-ink">Otimizar velocidade de carregamento</h3><p className="mt-1 text-[13px] themeable-text-ink-muted-48">Cole este código dentro da tag &lt;head&gt; do seu site.</p><pre className="mt-3 overflow-auto rounded-[11px] bg-[#111] p-4 text-[12px] text-white">{speedCode}</pre><button type="button" onClick={() => copy(speedCode, "speed")} className="mt-3 min-h-11 rounded-full border px-5 text-[14px] themeable-border-hairline themeable-text-ink">{copied === "speed" ? "Copiado" : "Copiar otimização"}</button></section>
      {!playerId && <p className="rounded-[11px] bg-amber-500/10 p-3 text-[13px] text-amber-600">Salve o player antes de usar o código definitivo de Embed.</p>}
    </div>
  </Dialog>;
}

function StudioToolRail({ active, config, onSelect }: { active: ModuleId | null; config: StudioConfig; onSelect: (module: ModuleId) => void }) {
  return <aside className="order-1 z-20 flex min-h-0 gap-1 overflow-x-auto border-b border-black/10 bg-white p-2 dark:border-white/10 dark:bg-[#171719] lg:row-start-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:p-3">
    <Link href="/dashboard/videos" className="group mb-1 flex h-11 min-w-12 items-center gap-3 rounded-[12px] px-3 text-[#515154] hover:bg-black/5 dark:text-[#a1a1a6] dark:hover:bg-white/5"><ArrowLeft size={18} className="shrink-0 transition-transform group-hover:-translate-x-1" /><span className="hidden text-[13px] font-semibold lg:inline">Voltar aos vídeos</span></Link>
    {modules.map((item) => {
      const Icon = item.icon;
      const enabled = item.status ? Boolean(config[item.status]) : true;
      return <button key={item.id} type="button" title={item.label} onClick={() => onSelect(item.id)} className={`group relative flex h-11 min-w-12 items-center gap-3 rounded-[12px] px-3 transition ${active === item.id ? "bg-[#0066cc] text-white shadow-[0_8px_22px_rgba(0,102,204,.2)]" : "text-[#515154] hover:bg-black/5 dark:text-[#a1a1a6] dark:hover:bg-white/5"}`}><Icon size={18} strokeWidth={1.75} className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" /><span className="hidden min-w-0 flex-1 truncate text-left text-[13px] font-semibold lg:block">{item.label}</span>{item.badge && <span className={`hidden rounded px-1.5 py-0.5 text-[9px] font-semibold lg:inline ${active === item.id ? "bg-white/20 text-white" : "bg-[#0066cc]/10 text-[#0066cc]"}`}>{item.badge}</span>}<span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full lg:static lg:h-2 lg:w-2 ${enabled ? "bg-emerald-400" : "bg-[#c7c7cc]"}`} /></button>;
    })}
  </aside>;
}

function StudioTimeline({ currentTime, duration, config, onSeek, onSelect }: { currentTime: number; duration: number; config: StudioConfig; onSeek: (time: number) => void; onSelect: (module: ModuleId) => void }) {
  const safeDuration = Math.max(1, duration || config.videoDuration || 1);
  const cursor = Math.min(100, Math.max(0, currentTime / safeDuration * 100));
  const clipLeft = (seconds: number) => `${Math.min(100, Math.max(0, seconds / safeDuration * 100))}%`;
  const clipWidth = (start: number, end: number) => `${Math.max(1.5, Math.min(100, (Math.max(start, end) - start) / safeDuration * 100))}%`;
  const ticks = Array.from({ length: 9 }, (_, index) => index / 8 * safeDuration);
  return <section className="order-4 border-t border-black/10 bg-white dark:border-white/10 dark:bg-[#111113] lg:col-span-3 lg:row-start-2">
    <div className="flex h-10 items-center gap-3 border-b border-black/10 px-4 text-[11px] dark:border-white/10"><strong className="text-[12px]">Timeline</strong><span className="text-[#7a7a7a]">{formatPlayerTime(currentTime)} / {formatPlayerTime(safeDuration)}</span><span className="ml-auto hidden text-[#7a7a7a] sm:inline">Clique ou arraste para navegar no vídeo</span></div>
    <div className="grid h-[149px] grid-cols-[92px_minmax(560px,1fr)] overflow-x-auto">
      <div className="border-r border-black/10 bg-[#fafafa] pt-7 text-[11px] dark:border-white/10 dark:bg-white/[0.025]"><button type="button" onClick={() => onSelect("playback")} className="flex h-9 w-full items-center gap-2 px-3 font-semibold"><Play size={13} />Vídeo</button><button type="button" onClick={() => onSelect("headlines")} className="flex h-8 w-full items-center gap-2 px-3"><Heading size={13} />Headline</button><button type="button" onClick={() => onSelect("captions")} className="flex h-8 w-full items-center gap-2 px-3"><Captions size={13} />Legendas</button><button type="button" onClick={() => onSelect("actions")} className="flex h-8 w-full items-center gap-2 px-3"><MousePointerClick size={13} />CTA</button></div>
      <div className="relative min-w-[560px] px-3 pt-1">
        <div className="relative h-6 text-[9px] text-[#8e8e93]">{ticks.map((time) => <span key={time} className="absolute top-1 -translate-x-1/2" style={{ left: `${time / safeDuration * 100}%` }}>{formatPlayerTime(time)}</span>)}</div>
        <input type="range" min={0} max={safeDuration} step={0.1} value={Math.min(currentTime, safeDuration)} onChange={(event) => onSeek(Number(event.target.value))} aria-label="Navegar no vídeo" className="absolute inset-x-3 top-0 z-30 h-7 cursor-ew-resize opacity-0" />
        <div className="absolute bottom-1 top-7 z-20 w-px bg-[#0066cc] shadow-[0_0_0_1px_rgba(255,255,255,.8)]" style={{ left: `calc(12px + (100% - 24px) * ${cursor / 100})` }}><span className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-[#0066cc]" /></div>
        <div className="relative h-9 overflow-hidden rounded-[7px] border border-[#0066cc]/25 bg-[#dbeafe]"><div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(90deg,#60a5fa_0_3px,transparent_3px_8px)]" /><span className="absolute left-3 top-2 text-[10px] font-semibold text-blue-900">VSL principal</span></div>
        <div className="relative mt-1 h-7 rounded-[6px] bg-[#f2f2f7] dark:bg-white/[0.05]">{config.headlineEnabled && <button type="button" onClick={() => onSelect("headlines")} className="absolute inset-y-1 rounded bg-violet-400/75 px-2 text-[9px] font-semibold text-white" style={{ left: "0%", width: "100%" }}>Headline</button>}</div>
        <div className="relative mt-1 h-7 rounded-[6px] bg-[#f2f2f7] dark:bg-white/[0.05]">{config.captionsEnabled && <button type="button" onClick={() => onSelect("captions")} className="absolute inset-y-1 rounded bg-emerald-500/80 px-2 text-[9px] font-semibold text-white" style={{ left: "0%", width: "100%" }}>Legendas</button>}</div>
        <div className="relative mt-1 h-7 rounded-[6px] bg-[#f2f2f7] dark:bg-white/[0.05]">{config.ctaEnabled && <button type="button" onClick={() => onSelect("actions")} className="absolute inset-y-1 overflow-hidden rounded bg-amber-500/90 px-2 text-left text-[9px] font-semibold text-white" style={{ left: clipLeft(config.ctaStart), width: clipWidth(config.ctaStart, config.ctaEnd > config.ctaStart ? config.ctaEnd : safeDuration) }}>CTA</button>}</div>
      </div>
    </div>
  </section>;
}

function ModulePanel({ module, config, update, onPoster, onCaption }: { module: ModuleId; config: StudioConfig; update: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void; onPoster: (file: File, kind: "start" | "pause" | "end") => void; onCaption: (file: File) => void }) {
  const definition = modules.find((item) => item.id === module)!;
  const Icon = definition.icon;
  const toggleStatus = (value: boolean) => {
    if (definition.status) update(definition.status, value as StudioConfig[typeof definition.status]);
  };
  return <div className="mx-auto w-full max-w-[310px]"><div className="mb-5 flex items-center gap-3 border-b border-black/10 pb-5 dark:border-white/10"><Icon size={21} className="shrink-0 text-[#0066cc] dark:text-[#2997ff]" /><h2 className="min-w-0 flex-1 truncate text-[18px] font-semibold">{definition.label}</h2>{definition.status && <Switch checked={Boolean(config[definition.status])} onChange={toggleStatus} />}</div><div className="space-y-6">{renderPanel(module, config, update, onPoster, onCaption)}</div></div>;
}

function renderPanel(module: ModuleId, c: StudioConfig, u: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void, onPoster: (file: File, kind: "start" | "pause" | "end") => void, onCaption: (file: File) => void) {
  if (module === "style") return <><Color label="Cor principal" value={c.accent} onChange={(v) => u("accent", v)} /><Range label="Cantos arredondados" value={c.radius} min={0} max={28} suffix="px" onChange={(v) => u("radius", v)} /><p className="panel-help">O raio recorta diretamente o vídeo. Não existe uma camada de fundo atrás dele, portanto nenhuma cor aparece nos cantos.</p><PanelTitle>Controles do player</PanelTitle><CheckRow label="Botão de play grande" checked={c.bigPlay} onChange={(v) => u("bigPlay", v)} /><CheckRow label="Botão de play pequeno" checked={c.playPause} onChange={(v) => u("playPause", v)} /><CheckRow label="Desativar pausa" checked={c.disablePause} onChange={(v) => u("disablePause", v)} /><CheckRow label="Barra de progresso" checked={c.progressBar} onChange={(v) => u("progressBar", v)} /><CheckRow label="Tempo do vídeo" checked={c.time} onChange={(v) => u("time", v)} /><CheckRow label="Voltar 10 segundos" checked={c.seekBackward} onChange={(v) => u("seekBackward", v)} /><CheckRow label="Avançar 10 segundos" checked={c.seekForward} onChange={(v) => u("seekForward", v)} /><CheckRow label="Volume" checked={c.volume} onChange={(v) => u("volume", v)} /><CheckRow label="Fullscreen" checked={c.fullscreen} onChange={(v) => u("fullscreen", v)} /><CheckRow label="Picture-in-Picture" checked={c.pictureInPicture} onChange={(v) => u("pictureInPicture", v)} /><CheckRow label="Controle de velocidade" checked={c.speedControl} onChange={(v) => u("speedControl", v)} /></>;
  if (module === "progress") return <><p className="panel-help">A barra avança mais rápido no início e desacelera perto do final, dando a percepção de que falta pouco para o vídeo terminar. Ela funciona independentemente da barra de progresso normal.</p><Color label="Cor da barra" value={c.progressColor} onChange={(v) => u("progressColor", v)} /><Range label="Altura" value={c.progressHeight} min={4} max={12} suffix="px" onChange={(v) => u("progressHeight", v)} /></>;
  if (module === "autoplay") return <><p className="panel-help">O vídeo começa silencioso conforme as políticas do navegador e reinicia do início, com som, quando o visitante interage.</p><TextArea label="Mensagem de ativação" value={c.autoplayMessage} onChange={(v) => u("autoplayMessage", v)} /><Color label="Cor do texto" value={c.autoplayTextColor} onChange={(v) => u("autoplayTextColor", v)} /><Color label="Cor do fundo" value={c.autoplayBackground} onChange={(v) => u("autoplayBackground", v)} /><Range label="Arredondamento" value={c.autoplayRadius} min={0} max={28} suffix="px" onChange={(v) => u("autoplayRadius", v)} /></>;
  if (module === "turbo") return <><p className="panel-help">Acelere a entrega sem alterar o áudio. No modo automático, cada sessão recebe uma velocidade dentro do intervalo configurado para você comparar a retenção.</p><Segmented label="Definir velocidade" value={c.turboMode} options={[{ label: "Automático", value: "automatic" }, { label: "Manual", value: "manual" }]} onChange={(v) => u("turboMode", v as StudioConfig["turboMode"])} />{c.turboMode === "automatic" ? <><Range label="Velocidade mínima" value={c.turboMin} min={0.9} max={1.5} step={0.1} suffix="x" onChange={(v) => { u("turboMin", Math.min(v, c.turboMax)); }} /><Range label="Velocidade máxima" value={c.turboMax} min={0.9} max={1.5} step={0.1} suffix="x" onChange={(v) => { u("turboMax", Math.max(v, c.turboMin)); }} /><div className="rounded-[11px] border border-[#0066cc]/20 bg-[#0066cc]/5 p-3 text-[12px] leading-relaxed text-[#515154] dark:text-[#a1a1a6]">Intervalo atual: <strong>{c.turboMin.toFixed(1)}x–{c.turboMax.toFixed(1)}x</strong>. A mesma pessoa mantém a velocidade durante a sessão.</div></> : <Select label="Velocidade manual" value={`${c.playbackRate.toFixed(1)}x`} options={["0.9x", "1.0x", "1.1x", "1.2x", "1.3x", "1.4x", "1.5x"]} onChange={(v) => u("playbackRate", Number(v.replace("x", "")))} />}</>;
  if (module === "headlines") return <><p className="panel-help">Use texto ou uma arte própria. Você pode cadastrar variações para distribuir sessões e descobrir qual headline gera mais plays.</p><Segmented label="Formato" value={c.headlineFormat} options={[{ label: "Texto", value: "text" }, { label: "Imagem / GIF", value: "image" }]} onChange={(v) => u("headlineFormat", v as StudioConfig["headlineFormat"])} />{c.headlineFormat === "text" ? <><TextArea label="Headline principal" value={c.headline} onChange={(v) => u("headline", v)} /><TextInput label="Adicionar variação para teste" placeholder="Digite e pressione Enter" onEnter={(value) => { const clean = value.trim(); if (clean && !c.headlineVariants.includes(clean)) u("headlineVariants", [...c.headlineVariants, clean]); }} />{c.headlineVariants.map((headline, index) => <div key={`${headline}-${index}`} className="flex items-start gap-3 rounded-[11px] border border-black/10 p-3 text-[13px] dark:border-white/10"><span className="flex-1">{headline}</span><button type="button" aria-label="Remover variação" onClick={() => u("headlineVariants", c.headlineVariants.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}<Segmented label="Alinhamento" value={c.headlineAlign} options={[{ label: "Esquerda", value: "left" }, { label: "Centro", value: "center" }, { label: "Direita", value: "right" }]} onChange={(v) => u("headlineAlign", v as StudioConfig["headlineAlign"])} /><Range label="Tamanho" value={c.headlineSize} min={16} max={64} suffix="px" onChange={(v) => u("headlineSize", v)} /><Color label="Cor do texto" value={c.headlineColor} onChange={(v) => u("headlineColor", v)} /><Color label="Cor de fundo" value={c.headlineBackground} onChange={(v) => u("headlineBackground", v)} /></> : <><UploadBox label="Imagem para desktop" selectedName={c.headlineDesktopName} accept="image/png,image/jpeg,image/webp,image/gif" onFile={(file) => { u("headlineDesktopName", file.name); window.dispatchEvent(new CustomEvent("prisma:headline-file", { detail: { viewport: "desktop", file } })); }} /><UploadBox label="Imagem para mobile" selectedName={c.headlineMobileName} accept="image/png,image/jpeg,image/webp,image/gif" onFile={(file) => { u("headlineMobileName", file.name); window.dispatchEvent(new CustomEvent("prisma:headline-file", { detail: { viewport: "mobile", file } })); }} /><p className="text-[12px] leading-relaxed text-[#7a7a7a]">PNG, JPG, WebP ou GIF. Comprima o arquivo antes do envio; no mobile, prefira uma arte vertical e legível.</p></>}</>;
  if (module === "hooks") return <><p className="panel-help">Use <strong>{"{mm:ss}"}</strong> no texto para mostrar uma contagem regressiva dinâmica até o desaparecimento.</p><TextArea label="Mensagem" value={c.miniHookText} onChange={(v) => u("miniHookText", v)} /><TimeRange label="Aparecer em" value={c.miniHookStart} max={Math.max(1, Math.floor(c.videoDuration || 1))} onChange={(v) => u("miniHookStart", v)} /><Range label="Duração" value={c.miniHookDuration} min={2} max={60} suffix="s" onChange={(v) => u("miniHookDuration", v)} /><Range label="Tamanho da fonte" value={c.miniHookSize} min={12} max={36} suffix="px" onChange={(v) => u("miniHookSize", v)} /><Range label="Arredondamento" value={c.miniHookRadius} min={0} max={28} suffix="px" onChange={(v) => u("miniHookRadius", v)} /><Segmented label="Alinhamento" value={c.miniHookAlign} options={[{ label: "Esquerda", value: "left" }, { label: "Centro", value: "center" }, { label: "Direita", value: "right" }]} onChange={(v) => u("miniHookAlign", v as StudioConfig["miniHookAlign"])} /><Color label="Cor do texto" value={c.miniHookTextColor} onChange={(v) => u("miniHookTextColor", v)} /><Color label="Cor do fundo" value={c.miniHookBackground} onChange={(v) => u("miniHookBackground", v)} /><Color label="Cor do contador" value={c.miniHookCounterColor} onChange={(v) => u("miniHookCounterColor", v)} /></>;
  if (module === "traffic") return <><p className="panel-help">As regras são avaliadas no backend. O navegador nunca recebe tokens privados nem a lista completa de bloqueios.</p><Select label="Idioma do navegador" value={c.browserLanguage} options={["Todos", "Português", "Inglês", "Espanhol"]} onChange={(v) => u("browserLanguage", v)} /><TextInput label="Países permitidos" value={c.allowedCountries} placeholder="Todos ou BR, PT, US" onChange={(v) => u("allowedCountries", v)} /><PanelTitle>Dispositivos permitidos</PanelTitle>{[["Desktop", "desktop"], ["Celular", "mobile"], ["Tablet", "tablet"]].map(([label, value]) => <CheckRow key={value} label={label} checked={c.allowedDevices.includes(value)} onChange={(checked) => u("allowedDevices", checked ? [...new Set([...c.allowedDevices, value])] : c.allowedDevices.filter((item) => item !== value))} />)}<CheckRow label="Exigir chave na URL" checked={c.urlKeyEnabled} onChange={(v) => u("urlKeyEnabled", v)} /><CheckRow label="Exigir token de acesso" checked={c.accessToken} onChange={(v) => u("accessToken", v)} /><CheckRow label="Bloquear Proxy / VPN" checked={c.blockVpn} onChange={(v) => u("blockVpn", v)} /><PanelTitle>Domínios autorizados</PanelTitle><TextInput label="Adicionar domínio" placeholder="checkout.exemplo.com" onEnter={(value) => { const clean = value.replace(/^https?:\/\//, "").replace(/\/.*$/, ""); if (clean && !c.domains.includes(clean)) u("domains", [...c.domains, clean]); }} />{c.domains.map((domain) => <div key={domain} className="flex min-h-11 items-center gap-2 rounded-[11px] bg-black/5 px-3 text-[13px] dark:bg-white/5"><Globe2 size={15} /><span className="flex-1 truncate">{domain}</span><button onClick={() => u("domains", c.domains.filter((item) => item !== domain))}>×</button></div>)}</>;
  if (module === "actions") return <><p className="panel-help">O CTA aparece fora do quadro do vídeo, sem criar fundo ou moldura extra na embed.</p><TextInput label="Nome do botão" value={c.ctaText} onChange={(v) => u("ctaText", v)} /><TextInput label="Link" value={c.ctaUrl} onChange={(v) => u("ctaUrl", v)} /><CheckRow label="Abrir em uma nova aba" checked={c.ctaNewTab} onChange={(v) => u("ctaNewTab", v)} /><TimeRange label="Início" value={c.ctaStart} max={Math.max(1, Math.floor(c.videoDuration || 1))} onChange={(v) => u("ctaStart", v)} /><TimeRange label="Término (0 = infinito)" value={c.ctaEnd} max={Math.max(1, Math.floor(c.videoDuration || 1))} onChange={(v) => u("ctaEnd", v)} /><CheckRow label="Manter exibição em visitas futuras" checked={c.ctaPersist} onChange={(v) => u("ctaPersist", v)} /><CheckRow label="Auto-scroll para o botão" checked={c.ctaAutoScroll} onChange={(v) => u("ctaAutoScroll", v)} /><PanelTitle>Aparência</PanelTitle><Range label="Tamanho da fonte" value={c.ctaFontSize} min={12} max={32} suffix="px" onChange={(v) => u("ctaFontSize", v)} /><Range label="Borda do botão" value={c.ctaRadius} min={0} max={40} suffix="px" onChange={(v) => u("ctaRadius", v)} /><Range label="Padding vertical" value={c.ctaPaddingY} min={6} max={32} suffix="px" onChange={(v) => u("ctaPaddingY", v)} /><Range label="Padding horizontal" value={c.ctaPaddingX} min={12} max={64} suffix="px" onChange={(v) => u("ctaPaddingX", v)} /><Color label="Cor do texto" value={c.ctaTextColor} onChange={(v) => u("ctaTextColor", v)} /><Color label="Cor do texto no hover" value={c.ctaHoverTextColor} onChange={(v) => u("ctaHoverTextColor", v)} /><Color label="Cor do botão" value={c.ctaBackground} onChange={(v) => u("ctaBackground", v)} /><Color label="Cor do botão no hover" value={c.ctaHoverBackground} onChange={(v) => u("ctaHoverBackground", v)} /><CheckRow label="Fazer o botão pulsar" checked={c.ctaPulse} onChange={(v) => u("ctaPulse", v)} /><CheckRow label="Usar sombra" checked={c.ctaShadow} onChange={(v) => u("ctaShadow", v)} /></>;
  if (module === "thumbnail") return <><p className="panel-help">Use capas diferentes para aumentar o clique inicial e recuperar pausas ou finais.</p><UploadBox label="Thumbnail inicial" selectedName={c.thumbnailStartName || (c.assets.thumbnailStart ? "Thumbnail inicial salva" : "")} accept="image/*" onFile={(file) => { onPoster(file, "start"); u("thumbnailStartName", file.name); u("thumbnailEnabled", true); }} /><UploadBox label="Thumbnail ao pausar" selectedName={c.thumbnailPauseName || (c.assets.thumbnailPause ? "Thumbnail de pausa salva" : "")} accept="image/*" onFile={(file) => { onPoster(file, "pause"); u("thumbnailPauseName", file.name); u("thumbnailEnabled", true); }} /><UploadBox label="Thumbnail ao finalizar" selectedName={c.thumbnailEndName || (c.assets.thumbnailEnd ? "Thumbnail final salva" : "")} accept="image/*" onFile={(file) => { onPoster(file, "end"); u("thumbnailEndName", file.name); u("thumbnailEnabled", true); }} /></>;
  if (module === "resume") return <TextArea label="Mensagem" value={c.resumeMessage} onChange={(v) => u("resumeMessage", v)} />;
  if (module === "pixels") return <><Select label="Provedor" value={c.pixelProvider} options={["Meta", "Google", "TikTok", "Personalizado"]} onChange={(v) => u("pixelProvider", v)} /><TextInput label="Nome" value={c.pixelName} onChange={(v) => u("pixelName", v)} /><TextInput label="ID público do pixel" value={c.pixelId} onChange={(v) => u("pixelId", v)} /><p className="panel-help">Use a embed JavaScript recomendada. Ela encaminha impressão, play, progresso, conclusão e clique no CTA para o pixel já instalado na página, sem expor tokens ou segredos.</p></>;
  if (module === "protection") return <><div className="rounded-[14px] border border-[#0066cc]/20 bg-[#0066cc]/5 p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><LockKeyhole size={18} className="text-[#0066cc]" />Proteção em camadas</div><p className="text-[12px] leading-relaxed text-[#515154] dark:text-[#a1a1a6]">Desativa download nativo, menu de contexto, arrastar o vídeo e atalhos comuns de inspeção. A mídia no R2 é entregue por URL assinada com validade curta.</p></div><CheckRow label="Ativar barreiras anti-download" checked={c.antiDownload} onChange={(v) => u("antiDownload", v)} /><p className="text-[11px] leading-relaxed text-[#7a7a7a]">Nenhum player web pode impedir totalmente a captura de uma mídia já reproduzida no dispositivo. Esta opção reduz cópia casual e dificulta reutilização direta do endereço.</p></>;
  if (module === "captions") return <UploadBox label={c.captionName || "Upload de legenda WebVTT"} accept=".vtt,text/vtt" onFile={(file) => { onCaption(file); u("captionName", file.name); u("captionsEnabled", true); }} />;
  return <><CheckRow label="Começar sem som" checked={c.muted} onChange={(v) => u("muted", v)} /><CheckRow label="Recomeçar após o fim" checked={c.loop} onChange={(v) => u("loop", v)} /><CheckRow label="Smart Pause ao trocar de aba" checked={c.smartPause} onChange={(v) => u("smartPause", v)} /><CheckRow label="Fullscreen no desktop" checked={c.fullscreenDesktop} onChange={(v) => u("fullscreenDesktop", v)} /><CheckRow label="Fullscreen no mobile" checked={c.fullscreenMobile} onChange={(v) => u("fullscreenMobile", v)} /></>;
}

function PanelTitle({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-black/10 pt-5 text-[15px] font-semibold dark:border-white/10">{children}</h3>; }
function HeadlinePreview({ config, desktopUrl, mobileUrl }: { config: StudioConfig; desktopUrl?: string; mobileUrl?: string }) {
  if (config.headlineFormat === "image" && (desktopUrl || mobileUrl)) {
    return <picture className="mx-auto mb-3 block max-h-[112px] max-w-2xl shrink-0 overflow-hidden"><source media="(max-width: 767px)" srcSet={mobileUrl || desktopUrl} /><img src={desktopUrl || mobileUrl} alt="Prévia da headline" className="block h-full max-h-[112px] w-full object-contain" /></picture>;
  }
  const explicitLines = Math.max(1, config.headline.split(/\r?\n/).length);
  const estimatedLines = Math.max(explicitLines, Math.ceil(config.headline.length / 44));
  const fittedFontSize = Math.max(16, Math.min(config.headlineSize, estimatedLines >= 4 ? 24 : estimatedLines === 3 ? 28 : config.headlineSize));
  return <div className="mb-3 flex max-h-[132px] min-h-12 shrink-0 items-center justify-center overflow-y-auto px-1"><h2 className="mx-auto w-fit max-w-2xl whitespace-pre-wrap break-words px-4 py-3 font-semibold leading-tight" style={{ color: config.headlineColor, backgroundColor: config.headlineBackground, fontSize: `${fittedFontSize}px`, textAlign: config.headlineAlign, borderRadius: `${Math.min(config.radius, 16)}px` }}>{config.headline || "Digite sua headline"}</h2></div>;
}
function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`ml-auto h-6 w-11 rounded-full p-1 ${checked ? "bg-green-500" : "bg-black/20 dark:bg-white/20"}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} /></button>; }
function ControlIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const Icon = normalized.includes("paus") ? PauseCircle : normalized.includes("progres") ? Gauge : normalized.includes("tempo") ? Clock3 : normalized.includes("voltar") ? Rewind : normalized.includes("avanç") ? FastForward : normalized.includes("volume") || normalized.includes("som") ? Volume2 : normalized.includes("fullscreen") ? Maximize : normalized.includes("picture") ? PictureInPicture2 : normalized.includes("veloc") ? Gauge : normalized.includes("desktop") ? MonitorPlay : normalized.includes("prote") || normalized.includes("token") || normalized.includes("vpn") || normalized.includes("chave") ? LockKeyhole : Play;
  return <Icon size={17} strokeWidth={1.8} className="shrink-0 text-[#0066cc] dark:text-[#2997ff]" aria-hidden="true" />;
}
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 items-center gap-3 rounded-[11px] bg-black/[0.035] px-3 text-[14px] dark:bg-white/5"><ControlIcon label={label} /><span className="flex-1">{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0066cc]" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<div className="mt-2 flex gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-14" /><input value={value} onChange={(e) => onChange(e.target.value)} className="studio-input" /></div></label>; }
function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) { return <fieldset><legend className="mb-2 text-[14px] font-semibold">{label}</legend><div className="grid grid-cols-2 gap-1 rounded-[11px] bg-black/5 p-1 dark:bg-white/5">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`min-h-10 rounded-[8px] px-2 text-[12px] font-semibold transition ${value === option.value ? "bg-white text-[#0066cc] shadow-sm dark:bg-white/10 dark:text-[#2997ff]" : "text-[#7a7a7a]"}`}>{option.label}</button>)}</div></fieldset>; }
function Range({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) { return <label className="block text-[14px] font-semibold">{label}<span className="float-right text-[12px] font-normal text-[#7a7a7a]">{value}{suffix}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[#0066cc]" /></label>; }
function formatPlayerTime(value: number) { const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function TimeRange({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) { const safeValue = Math.min(Math.max(0, value), max); return <label className="block text-[14px] font-semibold">{label}<span className="float-right rounded-full bg-[#0066cc]/10 px-2 py-1 text-[12px] font-semibold text-[#0066cc] dark:text-[#2997ff]">{formatPlayerTime(safeValue)} / {formatPlayerTime(max)}</span><input type="range" min={0} max={max} step={1} value={safeValue} onChange={(e) => onChange(Number(e.target.value))} className="mt-4 w-full accent-[#0066cc]" /></label>; }
const WORLD_COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
function CountryPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const normalizedValue = value.trim().toLowerCase();
  const allSelected = normalizedValue === "todos";
  const noneSelected = normalizedValue === "nenhum";
  const selected = allSelected || noneSelected ? [] : value.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
  const displayNames = useMemo(() => new Intl.DisplayNames(["pt-BR"], { type: "region" }), []);
  const countries = useMemo(() => WORLD_COUNTRY_CODES.map((code) => ({ code, name: displayNames.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [displayNames]);
  const visible = countries.filter((country) => `${country.name} ${country.code}`.toLowerCase().includes(search.toLowerCase()));
  const toggle = (code: string, checked: boolean) => {
    const current = allSelected ? WORLD_COUNTRY_CODES : selected;
    const next = checked ? [...new Set([...current, code])] : current.filter((item) => item !== code);
    onChange(next.length ? next.join(",") : "Nenhum");
  };
  return <fieldset className="space-y-2"><div className="flex items-start justify-between gap-3"><legend className="text-[14px] font-semibold">Países permitidos</legend><div className="flex flex-wrap justify-end gap-x-3 gap-y-1"><button type="button" className="text-[12px] font-semibold text-[#0066cc]" onClick={() => onChange("Todos")}>Permitir todos</button><button type="button" className="text-[12px] font-semibold text-red-500" onClick={() => onChange("Nenhum")}>Desmarcar todos</button></div></div><input className="studio-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar país" /><div className="max-h-64 space-y-1 overflow-y-auto rounded-[11px] border border-black/10 p-2 dark:border-white/10">{visible.map((country) => <label key={country.code} className="flex min-h-9 cursor-pointer items-center gap-3 rounded-[8px] px-2 text-[13px] hover:bg-black/5 dark:hover:bg-white/5"><input type="checkbox" className="h-4 w-4 accent-[#0066cc]" checked={allSelected || selected.includes(country.code)} onChange={(event) => toggle(country.code, event.target.checked)} /><span className="flex-1">{country.name}</span><span className="text-[11px] text-[#7a7a7a]">{country.code}</span></label>)}</div><p className="text-[11px] text-[#7a7a7a]">{allSelected ? "Todos os países permitidos" : noneSelected ? "Nenhum país permitido" : `${selected.length} país(es) permitido(s)`}</p></fieldset>;
}
function TextInput({ label, value, placeholder, onChange, onEnter }: { label: string; value?: string; placeholder?: string; onChange?: (value: string) => void; onEnter?: (value: string) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  if (label === "Países permitidos" && onChange) return <CountryPicker value={value ?? "Todos"} onChange={onChange} />;
  const controlled = value !== undefined;
  const inputValue = controlled ? value : draft;
  return <label className="block text-[14px] font-semibold">{label}<input value={inputValue} placeholder={placeholder} autoComplete="off" spellCheck onChange={(event) => { const next = event.currentTarget.value; if (!controlled) setDraft(next); onChange?.(next); }} onKeyDown={(event) => { if (event.key === "Enter" && onEnter) { event.preventDefault(); const next = event.currentTarget.value; onEnter(next); if (!controlled) setDraft(""); } }} className="studio-input mt-2" /></label>;
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<textarea rows={4} value={value} spellCheck onChange={(event) => onChange(event.currentTarget.value)} className="studio-input mt-2 resize-y" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="studio-input mt-2">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function UploadBox({ label, selectedName, accept, onFile }: { label: string; selectedName?: string; accept: string; onFile: (file: File) => void }) { return <label className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed px-4 text-center transition-colors ${selectedName ? "border-green-500 bg-green-500/10" : "border-[#0066cc]"}`}><Subtitles size={26} className={`mb-3 ${selectedName ? "text-green-500" : "text-[#0066cc]"}`} /><span className="text-[14px] font-semibold">{label}</span>{selectedName ? <><span className="mt-2 max-w-full truncate text-[12px] font-semibold text-green-600 dark:text-green-400">✓ {selectedName}</span><span className="mt-1 text-[11px] text-[#7a7a7a]">Clique para substituir</span></> : <span className="mt-1 text-[12px] text-[#7a7a7a]">Clique para selecionar</span>}<input type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>; }
