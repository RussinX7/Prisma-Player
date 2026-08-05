"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Captions,
  Check,
  Clock3,
  Code2,
  FastForward,
  Gauge,
  Gift,
  Globe2,
  Heading,
  ImageIcon,
  Inbox,
  LockKeyhole,
  Maximize,
  MonitorPlay,
  MousePointerClick,
  Palette,
  PauseCircle,
  PictureInPicture2,
  Play,
  Plus,
  Radio,
  Rewind,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Subtitles,
  TimerReset,
  Trash2,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Dialog from "@/components/ui/Dialog";
import { VideoPlayer } from "@/features/player/components";
import PixelTrackingPanel, { type PixelTrackingFields } from "./PixelTrackingPanel";

interface StoredVideo { id?: string; name: string; src: string; type: string }
type ModuleId = "style" | "progress" | "autoplay" | "turbo" | "headlines" | "hooks" | "traffic" | "actions" | "thumbnail" | "resume" | "pixels" | "captions" | "protection" | "playback";

export interface PresetItem {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

interface StudioConfig extends PixelTrackingFields {
  accent: string; background: string; gradientEnd: string; colorStyle: "solid" | "gradient"; radius: number; bigPlay: boolean; playPause: boolean; disablePause: boolean; progressBar: boolean; time: boolean; seekBackward: boolean; seekForward: boolean; volume: boolean; fullscreen: boolean; pictureInPicture: boolean; speedControl: boolean;
  smartProgress: boolean; progressColor: string; progressHeight: number;
  smartAutoplay: boolean; autoplayMessage: string; autoplayTextColor: string; autoplayBackground: string; autoplayRadius: number;
  autoplayCoverType: "standard" | "gif" | "image"; autoplayGifUrl: string; autoplayImageUrl: string; autoplayTagBadge: string; autoplayAnimation: "pulse" | "sound_bars" | "cursor_click" | "play_glow";
  turboMode: "automatic" | "manual"; turboMin: number; turboMax: number; playbackRate: number;
  headlineEnabled: boolean; headline: string; headlineVariants: string[]; headlineFormat: "text" | "image"; headlineDesktopName: string; headlineMobileName: string; headlineColor: string; headlineBackground: string; headlineSize: number; headlineAlign: "left" | "center" | "right"; headlineTagBadge: string;
  trafficEnabled: boolean; domains: string[]; browserLanguage: string; allowedCountries: string; allowedDevices: string[]; blockVpn: boolean; urlKeyEnabled: boolean; accessToken: boolean;
  miniHooksEnabled: boolean; miniHookText: string; miniHookStart: number; miniHookDuration: number; miniHookTextColor: string; miniHookBackground: string; miniHookCounterColor: string; miniHookSize: number; miniHookRadius: number; miniHookAlign: "left" | "center" | "right"; miniHookType: "live_viewers" | "sound_indicator" | "fast_speed" | "geo" | "custom";
  ctaEnabled: boolean; ctaText: string; ctaSubtitle: string; ctaBadges: string; ctaUrl: string; ctaStart: number; ctaEnd: number; ctaNewTab: boolean; ctaPersist: boolean; ctaAutoScroll: boolean; ctaTextColor: string; ctaHoverTextColor: string; ctaBackground: string; ctaHoverBackground: string; ctaFontSize: number; ctaRadius: number; ctaPaddingY: number; ctaPaddingX: number; ctaPulse: boolean; ctaShadow: boolean;
  thumbnailEnabled: boolean; resumeEnabled: boolean; resumeMessage: string;
  thumbnailStartName: string; thumbnailPauseName: string; thumbnailEndName: string;
  pixelsEnabled: boolean; pixelProvider: string; pixelName: string; pixelId: string; captionsEnabled: boolean; captionName: string;
  loop: boolean; muted: boolean; smartPause: boolean; fullscreenDesktop: boolean; fullscreenMobile: boolean; antiDownload: boolean; videoDuration: number; aspectRatio: number;
  assets: Record<string, string>;
}

const rates = [0.75, 1, 1.25, 1.5, 2];
const modules: Array<{ id: ModuleId; label: string; icon: typeof Palette; status?: keyof StudioConfig; badge?: string }> = [
  { id: "style", label: "Estilo", icon: Palette },
  { id: "progress", label: "Progresso inteligente", icon: Gauge, status: "smartProgress" },
  { id: "autoplay", label: "Smart Autoplay", icon: Play, status: "smartAutoplay", badge: "Personalizável" },
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

const defaultAutoplayPresets: PresetItem[] = [
  {
    id: "auto-1",
    name: "⚡ Padrão Pulso Verde Limão",
    data: {
      autoplayCoverType: "standard",
      autoplayMessage: "Seu vídeo já começou. Clique para ouvir.",
      autoplayTagBadge: "🔴 AULÃO AO VIVO",
      autoplayTextColor: "#191A23",
      autoplayBackground: "#B9FF66",
      autoplayRadius: 16,
      autoplayAnimation: "pulse",
    },
  },
  {
    id: "auto-2",
    name: "🎬 Overlay GIF Animado",
    data: {
      autoplayCoverType: "gif",
      autoplayGifUrl: "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif",
      autoplayMessage: "CLIQUE PARA ATIVAR O ÁUDIO DO VÍDEO",
      autoplayTagBadge: "🔥 VÍDEO EXCLUSIVO",
      autoplayTextColor: "#ffffff",
      autoplayBackground: "#191A23",
      autoplayRadius: 20,
      autoplayAnimation: "sound_bars",
    },
  },
  {
    id: "auto-3",
    name: "🌙 Dark Glassmorphism",
    data: {
      autoplayCoverType: "standard",
      autoplayMessage: "Atenção: O áudio está desativado. Clique para ouvir.",
      autoplayTagBadge: "⚠️ ÁUDIO DESATIVADO",
      autoplayTextColor: "#ffffff",
      autoplayBackground: "#000000d0",
      autoplayRadius: 12,
      autoplayAnimation: "cursor_click",
    },
  },
  {
    id: "auto-4",
    name: "🖼️ Capa com Imagem & Ícone",
    data: {
      autoplayCoverType: "image",
      autoplayImageUrl: "",
      autoplayMessage: "Ouvir explicação completa em áudio",
      autoplayTagBadge: "📍 SESSÃO PRIVADA",
      autoplayTextColor: "#191A23",
      autoplayBackground: "#ffffff",
      autoplayRadius: 24,
      autoplayAnimation: "play_glow",
    },
  },
  {
    id: "auto-5",
    name: "🟢 Verde Limão Hero",
    data: {
      autoplayCoverType: "standard",
      autoplayMessage: "ASSISTIR AULA AGORA COM SOM",
      autoplayTagBadge: "⚡ VAGAS LIMITADAS",
      autoplayTextColor: "#191A23",
      autoplayBackground: "#B9FF66",
      autoplayRadius: 14,
      autoplayAnimation: "pulse",
    },
  },
];

const defaultHeadlinePresets: PresetItem[] = [
  { id: "head-1", name: "⚡ Headline Clássica Centrada", data: { headline: "Descubra a maneira mais simples de transformar atenção em vendas", headlineTagBadge: "🔥 EXCLUSIVO", headlineColor: "#1d1d1f", headlineBackground: "#ffffff", headlineSize: 28, headlineAlign: "center" } },
  { id: "head-2", name: "🔥 Urgência Total com Fundo Neon", data: { headline: "⚠️ ATENÇÃO: Esta apresentação sairá do ar em poucas horas", headlineTagBadge: "⚠️ URGENTE", headlineColor: "#191A23", headlineBackground: "#B9FF66", headlineSize: 30, headlineAlign: "center" } },
  { id: "head-3", name: "🎯 Pergunta Direta para o Lead", data: { headline: "Você já tentou de tudo para escalar suas vendas e continua travado?", headlineTagBadge: "❓ PERGUNTA", headlineColor: "#ffffff", headlineBackground: "#191A23", headlineSize: 26, headlineAlign: "center" } },
];

const defaultCtaPresets: PresetItem[] = [
  { id: "cta-1", name: "🟢 Botão Verde Limão Hero", data: { ctaText: "QUERO GARANTIR MINHA VAGA AGORA", ctaSubtitle: "🔒 Compra 100% Segura • Acesso Imediato", ctaBadges: "7 Dias de Garantia • Pix em 12x", ctaBackground: "#B9FF66", ctaTextColor: "#191A23", ctaHoverBackground: "#a6ee50", ctaPulse: true } },
  { id: "cta-2", name: "⚡ Botão Pulsante Neon", data: { ctaText: "SIM! QUERO MUDAR DE VIDA HOJE", ctaSubtitle: "⚡ Desconto de 70% aplicado automaticamente", ctaBadges: "Satisfação Garantida ou 100% de Reembolso", ctaBackground: "#0066cc", ctaTextColor: "#ffffff", ctaHoverBackground: "#0055aa", ctaPulse: true } },
  { id: "cta-3", name: "🔒 Botão Compra Segura + Pix", data: { ctaText: "ACESSAR O MÉTODO COMPLETO", ctaSubtitle: "💳 Cartão de Crédito em até 12x ou Pix Instantâneo", ctaBadges: "🔒 Ambiente Criptografado SSL 256-bit", ctaBackground: "#191A23", ctaTextColor: "#B9FF66", ctaHoverBackground: "#2c2d3c", ctaPulse: false } },
];

const defaultHookPresets: PresetItem[] = [
  { id: "hook-1", name: "🔥 Audiência Ao Vivo: 1.482 assistindo", data: { miniHookType: "live_viewers", miniHookText: "🔥 1.482 pessoas assistindo a este vídeo agora", miniHookTextColor: "#ffffff", miniHookBackground: "#191A23" } },
  { id: "hook-2", name: "🔊 Aviso de Som: Ligue o Áudio", data: { miniHookType: "sound_indicator", miniHookText: "🔊 Ligue o som do seu celular para ouvir a explicação", miniHookTextColor: "#191A23", miniHookBackground: "#B9FF66" } },
  { id: "hook-3", name: "⏱️ Contagem Regressiva", data: { miniHookType: "custom", miniHookText: "Continue assistindo — o conteúdo expira em {mm:ss}", miniHookTextColor: "#ffffff", miniHookBackground: "#111111" } },
];

const initialConfig: StudioConfig = {
  accent: "#0066cc", background: "#000000", gradientEnd: "#2997ff", colorStyle: "solid", radius: 0, bigPlay: true, playPause: true, disablePause: false, progressBar: true, time: true, seekBackward: false, seekForward: false, volume: true, fullscreen: true, pictureInPicture: true, speedControl: true,
  smartProgress: true, progressColor: "#0066cc", progressHeight: 6,
  smartAutoplay: true, autoplayMessage: "Seu vídeo já começou. Clique para ouvir.", autoplayTextColor: "#191A23", autoplayBackground: "#B9FF66", autoplayRadius: 16,
  autoplayCoverType: "standard", autoplayGifUrl: "", autoplayImageUrl: "", autoplayTagBadge: "🔴 AULÃO AO VIVO", autoplayAnimation: "pulse",
  turboMode: "manual", turboMin: 1, turboMax: 1.2, playbackRate: 1,
  headlineEnabled: true, headline: "Descubra a maneira mais simples de transformar atenção em vendas", headlineVariants: [], headlineFormat: "text", headlineDesktopName: "", headlineMobileName: "", headlineColor: "#1d1d1f", headlineBackground: "#ffffff", headlineSize: 30, headlineAlign: "center", headlineTagBadge: "🔥 EXCLUSIVO",
  trafficEnabled: false, domains: [], browserLanguage: "Todos", allowedCountries: "Todos", allowedDevices: ["desktop", "mobile", "tablet"], blockVpn: true, urlKeyEnabled: false, accessToken: false,
  miniHooksEnabled: false, miniHookText: "Continue assistindo — a parte mais importante está chegando.", miniHookStart: 30, miniHookDuration: 6, miniHookTextColor: "#ffffff", miniHookBackground: "#111111", miniHookCounterColor: "#ff3b30", miniHookSize: 16, miniHookRadius: 10, miniHookAlign: "center", miniHookType: "custom",
  ctaEnabled: false, ctaText: "Quero aproveitar agora", ctaSubtitle: "🔒 Compra 100% Segura • Entrega Imediata", ctaBadges: "7 Dias de Garantia • Pix em 12x", ctaUrl: "https://", ctaStart: 60, ctaEnd: 0, ctaNewTab: true, ctaPersist: true, ctaAutoScroll: false, ctaTextColor: "#191A23", ctaHoverTextColor: "#191A23", ctaBackground: "#B9FF66", ctaHoverBackground: "#a6ee50", ctaFontSize: 18, ctaRadius: 12, ctaPaddingY: 12, ctaPaddingX: 24, ctaPulse: false, ctaShadow: true,
  thumbnailEnabled: false, resumeEnabled: true, resumeMessage: "Você já começou a assistir este vídeo",
  thumbnailStartName: "", thumbnailPauseName: "", thumbnailEndName: "",
  pixelsEnabled: false, pixelProvider: "Meta", pixelName: "", pixelId: "", metaPixelEnabled: false, metaPixelId: "", googlePixelEnabled: false, googleTagId: "", googleConversionDestination: "", tiktokPixelEnabled: false, tiktokPixelId: "", pixelConsentMode: "banner", pixelConsentTitle: "Sua privacidade importa", pixelConsentDescription: "Usamos tecnologias de publicidade para medir resultados e melhorar sua experiência.", pixelConsentAcceptLabel: "Aceitar", pixelConsentRejectLabel: "Recusar", pixelPrivacyUrl: "", captionsEnabled: false, captionName: "",
  loop: false, muted: false, smartPause: true, fullscreenDesktop: true, fullscreenMobile: true, antiDownload: true, videoDuration: 0, aspectRatio: 16 / 9,
  assets: {},
};

export default function VslStudio() {
  const router = useRouter();
  const [video] = useState<StoredVideo | null>(() => { if (typeof window === "undefined") return null; try { return JSON.parse(sessionStorage.getItem("prisma-mvp-video") ?? "null") as StoredVideo | null; } catch { return null; } });
  const [active, setActiveState] = useState<ModuleId | null>("autoplay");
  const [config, setConfig] = useState<StudioConfig>(() => {
    if (typeof window === "undefined") return initialConfig;
    try { return { ...initialConfig, ...JSON.parse(localStorage.getItem("prisma-studio-config") ?? "{}") as Partial<StudioConfig> }; }
    catch { return initialConfig; }
  });

  // Presets States
  const [autoplayPresetList, setAutoplayPresetList] = useState<PresetItem[]>(defaultAutoplayPresets);
  const [activeAutoplayIndex, setActiveAutoplayIndex] = useState(0);

  const [headlinePresetList, setHeadlinePresetList] = useState<PresetItem[]>(defaultHeadlinePresets);
  const [activeHeadlineIndex, setActiveHeadlineIndex] = useState(0);

  const [ctaPresetList, setCtaPresetList] = useState<PresetItem[]>(defaultCtaPresets);
  const [activeCtaIndex, setActiveCtaIndex] = useState(0);

  const [hookPresetList, setHookPresetList] = useState<PresetItem[]>(defaultHookPresets);
  const [activeHookIndex, setActiveHookIndex] = useState(0);

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

  const update = <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => {
    dirtyConfigKeys.current.add(key);
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const applyPresetData = (data: Record<string, unknown>) => {
    Object.entries(data).forEach(([key, val]) => {
      update(key as keyof StudioConfig, val as StudioConfig[keyof StudioConfig]);
    });
  };

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

  const previewStyle = useMemo(() => {
    if (!videoSize.width || !videoSize.height) return { width: "100%", aspectRatio: "16 / 9" };
    return { width: "100%", aspectRatio: `${videoSize.width} / ${videoSize.height}` };
  }, [videoSize]);

  const playerStyle = useMemo(() => ({ borderRadius: `${config.radius}px` }), [config.radius]);

  const handleMetadata = (meta: { duration: number; width: number; height: number }) => {
    setDuration(meta.duration);
    if (meta.width > 0 && meta.height > 0) setVideoSize({ width: meta.width, height: meta.height });
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const setActive = (id: ModuleId | null) => {
    setActiveState(id);
    if (id === "autoplay") setAutoplayActivated(false);
  };

  const handlePoster = (file: File, kind: "start" | "pause" | "end") => {
    const url = URL.createObjectURL(file);
    if (kind === "start") { setPosterUrl(url); setAssetFiles((prev) => ({ ...prev, thumbnailStart: file })); }
    else if (kind === "pause") { setPausePosterUrl(url); setAssetFiles((prev) => ({ ...prev, thumbnailPause: file })); }
    else { setEndPosterUrl(url); setAssetFiles((prev) => ({ ...prev, thumbnailEnd: file })); }
  };

  const handleCaption = (file: File) => {
    const url = URL.createObjectURL(file);
    setCaptionTrack({ src: url, kind: "subtitles", label: config.captionName || "Legendas", srclang: "pt-BR", default: true });
    setAssetFiles((prev) => ({ ...prev, captions: file }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setSaveError("");
    try {
      localStorage.setItem("prisma-studio-config", JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Não foi possível salvar as configurações");
    } finally {
      setSaving(false);
    }
  };

  const removeVsl = async () => {
    if (!video?.id) return;
    setDeleting(true);
    try {
      await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      sessionStorage.removeItem("prisma-mvp-video");
      router.push("/dashboard/videos");
    } catch {
      setDeleting(false);
    }
  };

  const availablePreviewHeight = Math.max(260, previewStageSize.height - (config.headlineEnabled ? 80 : 0) - (config.ctaEnabled ? 70 : 0));

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-[#1d1d1f] dark:bg-[#000000] dark:text-white">
      {/* Studio Navigation Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/videos" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <BrandLogo />
            <span className="text-xs font-bold text-[#191A23] dark:text-white">• Estúdio VSL</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void saveConfig()} disabled={saving} className="flex h-9 items-center gap-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6ee50] px-4 text-xs font-bold text-[#191A23] shadow-xs cursor-pointer disabled:opacity-50">
            <Save size={15} />
            {saving ? "Salvando..." : "Salvar Player"}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[280px_340px_minmax(0,1fr)]">
        {/* Column 1: Modules Selection Drawer */}
        <aside className="order-1 flex flex-col border-r border-black/10 bg-[#fafafa] dark:border-white/10 dark:bg-[#09090b]">
          <div className="p-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-black/5 dark:border-white/5">
            Módulos do Player
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {modules.map((item) => {
              const isSelected = active === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <IconComp size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? "bg-[#191A23] text-[#B9FF66]" : "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Column 2: Module Customization Settings Panel */}
        {active && (
          <aside className="order-2 flex flex-col border-r border-black/10 bg-white dark:border-white/10 dark:bg-[#111113] overflow-y-auto">
            <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#191A23] dark:text-white">
                {modules.find((m) => m.id === active)?.label}
              </h3>
              <button type="button" onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Presets Manager Component */}
              {active === "autoplay" && (
                <PresetBar
                  title="Smart Autoplayer"
                  presets={autoplayPresetList}
                  activeIndex={activeAutoplayIndex}
                  onSelect={(idx) => {
                    setActiveAutoplayIndex(idx);
                    applyPresetData(autoplayPresetList[idx].data);
                  }}
                  onCreate={() => {
                    const newIndex = autoplayPresetList.length + 1;
                    const newPreset: PresetItem = {
                      id: `auto-custom-${Date.now()}`,
                      name: `⚡ Preset ${newIndex}`,
                      data: {
                        autoplayCoverType: "standard",
                        autoplayMessage: "Seu vídeo já começou. Clique para ouvir.",
                        autoplayTagBadge: "🔴 AULÃO AO VIVO",
                        autoplayTextColor: "#191A23",
                        autoplayBackground: "#B9FF66",
                        autoplayRadius: 16,
                        autoplayAnimation: "pulse",
                      },
                    };
                    setAutoplayPresetList((prev) => [...prev, newPreset]);
                    setActiveAutoplayIndex(autoplayPresetList.length);
                    applyPresetData(newPreset.data);
                  }}
                  onDelete={(idx) => {
                    const next = autoplayPresetList.filter((_, i) => i !== idx);
                    setAutoplayPresetList(next);
                    const safeIdx = Math.max(0, idx - 1);
                    setActiveAutoplayIndex(safeIdx);
                    if (next[safeIdx]) applyPresetData(next[safeIdx].data);
                  }}
                />
              )}

              {active === "headlines" && (
                <PresetBar
                  title="Headline"
                  presets={headlinePresetList}
                  activeIndex={activeHeadlineIndex}
                  onSelect={(idx) => {
                    setActiveHeadlineIndex(idx);
                    applyPresetData(headlinePresetList[idx].data);
                  }}
                  onCreate={() => {
                    const newIndex = headlinePresetList.length + 1;
                    const newPreset: PresetItem = {
                      id: `head-custom-${Date.now()}`,
                      name: `🔥 Headline ${newIndex}`,
                      data: {
                        headline: "Digite a sua nova headline de alta conversão aqui",
                        headlineTagBadge: "🔥 NOVO",
                        headlineColor: "#191A23",
                        headlineBackground: "#B9FF66",
                        headlineSize: 28,
                        headlineAlign: "center",
                      },
                    };
                    setHeadlinePresetList((prev) => [...prev, newPreset]);
                    setActiveHeadlineIndex(headlinePresetList.length);
                    applyPresetData(newPreset.data);
                  }}
                  onDelete={(idx) => {
                    const next = headlinePresetList.filter((_, i) => i !== idx);
                    setHeadlinePresetList(next);
                    const safeIdx = Math.max(0, idx - 1);
                    setActiveHeadlineIndex(safeIdx);
                    if (next[safeIdx]) applyPresetData(next[safeIdx].data);
                  }}
                />
              )}

              {active === "actions" && (
                <PresetBar
                  title="Botão CTA"
                  presets={ctaPresetList}
                  activeIndex={activeCtaIndex}
                  onSelect={(idx) => {
                    setActiveCtaIndex(idx);
                    applyPresetData(ctaPresetList[idx].data);
                  }}
                  onCreate={() => {
                    const newIndex = ctaPresetList.length + 1;
                    const newPreset: PresetItem = {
                      id: `cta-custom-${Date.now()}`,
                      name: `🟢 Botão ${newIndex}`,
                      data: {
                        ctaText: "QUERO APROVEITAR A OFERTA AGORA",
                        ctaSubtitle: "🔒 Compra 100% Segura • Acesso Imediato",
                        ctaBadges: "7 Dias de Garantia • Pix em 12x",
                        ctaBackground: "#B9FF66",
                        ctaTextColor: "#191A23",
                        ctaHoverBackground: "#a6ee50",
                        ctaPulse: true,
                      },
                    };
                    setCtaPresetList((prev) => [...prev, newPreset]);
                    setActiveCtaIndex(ctaPresetList.length);
                    applyPresetData(newPreset.data);
                  }}
                  onDelete={(idx) => {
                    const next = ctaPresetList.filter((_, i) => i !== idx);
                    setCtaPresetList(next);
                    const safeIdx = Math.max(0, idx - 1);
                    setActiveCtaIndex(safeIdx);
                    if (next[safeIdx]) applyPresetData(next[safeIdx].data);
                  }}
                />
              )}

              {active === "hooks" && (
                <PresetBar
                  title="Mini-Ganhos"
                  presets={hookPresetList}
                  activeIndex={activeHookIndex}
                  onSelect={(idx) => {
                    setActiveHookIndex(idx);
                    applyPresetData(hookPresetList[idx].data);
                  }}
                  onCreate={() => {
                    const newIndex = hookPresetList.length + 1;
                    const newPreset: PresetItem = {
                      id: `hook-custom-${Date.now()}`,
                      name: `⚡ Widget ${newIndex}`,
                      data: {
                        miniHookType: "live_viewers",
                        miniHookText: "🔥 1.482 pessoas assistindo a este vídeo agora",
                        miniHookTextColor: "#ffffff",
                        miniHookBackground: "#191A23",
                      },
                    };
                    setHookPresetList((prev) => [...prev, newPreset]);
                    setActiveHookIndex(hookPresetList.length);
                    applyPresetData(newPreset.data);
                  }}
                  onDelete={(idx) => {
                    const next = hookPresetList.filter((_, i) => i !== idx);
                    setHookPresetList(next);
                    const safeIdx = Math.max(0, idx - 1);
                    setActiveHookIndex(safeIdx);
                    if (next[safeIdx]) applyPresetData(next[safeIdx].data);
                  }}
                />
              )}

              {/* Module Form Controls */}
              {renderPanel(active, config, update, handlePoster, handleCaption, playerId, video?.id)}
            </div>
          </aside>
        )}

        {/* Column 3: Live Player Preview & Timeline Stage */}
        <main className="order-3 flex flex-1 flex-col overflow-hidden bg-[#f5f5f7] dark:bg-black p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#B9FF66]" /> Prévia em Tempo Real
            </span>
            <span className="rounded-full bg-slate-200 dark:bg-zinc-800 px-3 py-0.5 text-xs font-bold text-slate-700 dark:text-zinc-300">
              {config.playbackRate.toFixed(2)}x
            </span>
          </div>

          <div ref={previewStageRef} className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
            {/* Headline Preview */}
            {config.headlineEnabled && (
              <HeadlinePreview config={config} desktopUrl={headlineDesktopUrl} mobileUrl={headlineMobileUrl} />
            )}

            {/* Video Canvas Container */}
            <div className="relative w-full max-w-3xl overflow-hidden shadow-2xl rounded-2xl bg-black" style={playerStyle}>
              {video ? (
                <VideoPlayer
                  key={`${posterUrl ?? "video"}-${config.smartAutoplay}`}
                  className="w-full"
                  sources={sources}
                  poster={config.thumbnailEnabled && !config.smartAutoplay ? posterUrl : undefined}
                  textTracks={config.captionsEnabled && captionTrack ? [captionTrack] : []}
                  autoplay={config.smartAutoplay && resumePoint === null && !posterPreviewActive}
                  muted={config.muted || (config.smartAutoplay && !autoplayActivated)}
                  controls
                  playbackRate={config.playbackRate}
                  playbackRates={rates}
                  loop={config.loop}
                  bigPlayButton={config.bigPlay}
                  pauseWhenHidden={config.smartPause}
                  startTime={startTime}
                  restartWithSoundSignal={restartWithSoundSignal}
                  resumePlaybackSignal={resumePlaybackSignal}
                  onLoadedMetadata={handleMetadata}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center text-center text-slate-400">
                  <div>
                    <Play size={40} className="mx-auto mb-2 text-[#B9FF66]" />
                    <p className="text-xs font-semibold">Selecione uma VSL para visualizar o player</p>
                  </div>
                </div>
              )}

              {/* Smart Autoplay Overlay Preview */}
              {config.smartAutoplay && !autoplayActivated && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStartTime(0);
                      setAutoplayActivated(true);
                      setRestartWithSoundSignal((prev) => prev + 1);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-5 text-center transition-transform active:scale-95 cursor-pointer ${
                      config.autoplayAnimation === "pulse" ? "animate-pulse" : ""
                    }`}
                    style={{
                      color: config.autoplayTextColor,
                      backgroundColor: config.autoplayBackground,
                      borderRadius: `${config.autoplayRadius}px`,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    }}
                  >
                    {config.autoplayTagBadge && (
                      <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                        {config.autoplayTagBadge}
                      </span>
                    )}
                    <span className="text-sm font-extrabold tracking-tight">
                      {config.autoplayMessage}
                    </span>
                    <span className="text-[11px] opacity-80 flex items-center gap-1 font-semibold">
                      <Volume2 size={13} /> toque para ativar o áudio
                    </span>
                  </button>
                </div>
              )}

              {/* Mini Hook / Micro-Engagement Widget Overlay */}
              {config.miniHooksEnabled && (
                <div
                  className="pointer-events-none absolute inset-x-4 top-4 z-20 mx-auto max-w-[480px] p-3 shadow-xl backdrop-blur-md flex items-center gap-2 font-bold"
                  style={{
                    color: config.miniHookTextColor,
                    backgroundColor: `${config.miniHookBackground}e8`,
                    fontSize: `${config.miniHookSize}px`,
                    borderRadius: `${config.miniHookRadius}px`,
                  }}
                >
                  <Sparkles size={16} className="shrink-0 text-[#B9FF66]" />
                  <span className="flex-1">{config.miniHookText}</span>
                </div>
              )}
            </div>

            {/* CTA Button Preview */}
            {config.ctaEnabled && (
              <div className="mt-5 text-center space-y-1.5">
                <a
                  href={config.ctaUrl}
                  target={config.ctaNewTab ? "_blank" : undefined}
                  rel="noreferrer"
                  className={`inline-flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 font-extrabold cursor-pointer ${
                    config.ctaPulse ? "animate-bounce" : ""
                  }`}
                  style={{
                    color: config.ctaTextColor,
                    backgroundColor: config.ctaBackground,
                    fontSize: `${config.ctaFontSize}px`,
                    borderRadius: `${config.ctaRadius}px`,
                    padding: `${config.ctaPaddingY}px ${config.ctaPaddingX}px`,
                    boxShadow: config.ctaShadow ? "0 10px 30px rgba(185,255,102,0.3)" : "none",
                  }}
                >
                  <span>{config.ctaText}</span>
                  {config.ctaSubtitle && (
                    <span className="text-[11px] font-normal opacity-90">{config.ctaSubtitle}</span>
                  )}
                </a>
                {config.ctaBadges && (
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    {config.ctaBadges}
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PresetBar({
  title,
  presets,
  activeIndex,
  onSelect,
  onCreate,
  onDelete,
}: {
  title: string;
  presets: PresetItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onCreate: () => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#191A23] dark:text-white uppercase tracking-wider">
          ⚡ Presets: {title}
        </span>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1 rounded-lg bg-[#B9FF66] px-2.5 py-1 text-[10px] font-bold text-[#191A23] hover:bg-[#a6ee50] shadow-xs cursor-pointer"
        >
          <Plus size={12} /> Criar Preset
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {presets.map((preset, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={preset.id}
              className={`flex items-center rounded-xl border px-2.5 py-1 transition-all ${
                isActive
                  ? "border-[#B9FF66] bg-[#B9FF66] text-[#191A23] font-bold shadow-xs"
                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(idx)}
                className="text-xs font-semibold cursor-pointer pr-1"
              >
                {preset.name}
              </button>
              {presets.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDelete(idx)}
                  className="text-slate-400 hover:text-red-600 text-xs pl-1 cursor-pointer"
                  title="Excluir preset"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModulePanel({ module, config, update, onPoster, onCaption, playerId, videoId }: { module: ModuleId; config: StudioConfig; update: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void; onPoster: (file: File, kind: "start" | "pause" | "end") => void; onCaption: (file: File) => void; playerId?: string; videoId?: string }) {
  const definition = modules.find((item) => item.id === module)!;
  const Icon = definition.icon;
  const toggleStatus = (value: boolean) => {
    if (definition.status) update(definition.status, value as StudioConfig[typeof definition.status]);
  };
  return <div className="mx-auto w-full max-w-[310px]"><div className="mb-5 flex items-center gap-3 border-b border-black/10 pb-5 dark:border-white/10"><Icon size={21} className="shrink-0 text-[#0066cc] dark:text-[#2997ff]" /><h2 className="min-w-0 flex-1 truncate text-[18px] font-semibold">{definition.label}</h2>{definition.status && <Switch checked={Boolean(config[definition.status])} onChange={toggleStatus} />}</div><div className="space-y-6">{renderPanel(module, config, update, onPoster, onCaption, playerId, videoId)}</div></div>;
}

function renderPanel(module: ModuleId, c: StudioConfig, u: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void, onPoster: (file: File, kind: "start" | "pause" | "end") => void, onCaption: (file: File) => void, playerId?: string, videoId?: string) {
  if (module === "style") return <><Color label="Cor principal" value={c.accent} onChange={(v) => u("accent", v)} /><Range label="Cantos arredondados" value={c.radius} min={0} max={28} suffix="px" onChange={(v) => u("radius", v)} /><p className="panel-help">O raio recorta diretamente o vídeo. Não existe uma camada de fundo atrás dele, portanto nenhuma cor aparece nos cantos.</p><PanelTitle>Controles do player</PanelTitle><CheckRow label="Botão de play grande" checked={c.bigPlay} onChange={(v) => u("bigPlay", v)} /><CheckRow label="Botão de play pequeno" checked={c.playPause} onChange={(v) => u("playPause", v)} /><CheckRow label="Desativar pausa" checked={c.disablePause} onChange={(v) => u("disablePause", v)} /><CheckRow label="Barra de progresso" checked={c.progressBar} onChange={(v) => u("progressBar", v)} /><CheckRow label="Tempo do vídeo" checked={c.time} onChange={(v) => u("time", v)} /><CheckRow label="Voltar 10 segundos" checked={c.seekBackward} onChange={(v) => u("seekBackward", v)} /><CheckRow label="Avançar 10 segundos" checked={c.seekForward} onChange={(v) => u("seekForward", v)} /><CheckRow label="Volume" checked={c.volume} onChange={(v) => u("volume", v)} /><CheckRow label="Fullscreen" checked={c.fullscreen} onChange={(v) => u("fullscreen", v)} /><CheckRow label="Picture-in-Picture" checked={c.pictureInPicture} onChange={(v) => u("pictureInPicture", v)} /><CheckRow label="Controle de velocidade" checked={c.speedControl} onChange={(v) => u("speedControl", v)} /></>;
  if (module === "progress") return <><p className="panel-help">A barra avança mais rápido no início e desacelera perto do final, dando a percepção de que falta pouco para o vídeo terminar.</p><Color label="Cor da barra" value={c.progressColor} onChange={(v) => u("progressColor", v)} /><Range label="Altura" value={c.progressHeight} min={4} max={12} suffix="px" onChange={(v) => u("progressHeight", v)} /></>;
  if (module === "autoplay") return <><p className="panel-help">Crie variações de Smart Autoplayer com GIFs, imagens e badges de ao vivo para comparar cliques.</p><TextInput label="Tag / Badge do botão" value={c.autoplayTagBadge} placeholder="Ex: 🔴 AULÃO AO VIVO" onChange={(v) => u("autoplayTagBadge", v)} /><TextArea label="Mensagem de ativação" value={c.autoplayMessage} onChange={(v) => u("autoplayMessage", v)} /><Color label="Cor do texto" value={c.autoplayTextColor} onChange={(v) => u("autoplayTextColor", v)} /><Color label="Cor do fundo" value={c.autoplayBackground} onChange={(v) => u("autoplayBackground", v)} /><Range label="Arredondamento" value={c.autoplayRadius} min={0} max={28} suffix="px" onChange={(v) => u("autoplayRadius", v)} /></>;
  if (module === "turbo") return <><p className="panel-help">Acelere a entrega sem alterar o áudio. No modo automático, cada sessão recebe uma velocidade dentro do intervalo configurado.</p><Segmented label="Definir velocidade" value={c.turboMode} options={[{ label: "Automático", value: "automatic" }, { label: "Manual", value: "manual" }]} onChange={(v) => u("turboMode", v as StudioConfig["turboMode"])} />{c.turboMode === "automatic" ? <><Range label="Velocidade mínima" value={c.turboMin} min={0.9} max={1.5} step={0.1} suffix="x" onChange={(v) => { u("turboMin", Math.min(v, c.turboMax)); }} /><Range label="Velocidade máxima" value={c.turboMax} min={0.9} max={1.5} step={0.1} suffix="x" onChange={(v) => { u("turboMax", Math.max(v, c.turboMin)); }} /></> : <Select label="Velocidade manual" value={`${c.playbackRate.toFixed(1)}x`} options={["0.9x", "1.0x", "1.1x", "1.2x", "1.3x", "1.4x", "1.5x"]} onChange={(v) => u("playbackRate", Number(v.replace("x", "")))} />}</>;
  if (module === "headlines") return <><TextInput label="Tag / Selo da Headline" value={c.headlineTagBadge} placeholder="Ex: 🔥 EXCLUSIVO" onChange={(v) => u("headlineTagBadge", v)} /><TextArea label="Headline principal" value={c.headline} onChange={(v) => u("headline", v)} /><Segmented label="Alinhamento" value={c.headlineAlign} options={[{ label: "Esquerda", value: "left" }, { label: "Centro", value: "center" }, { label: "Direita", value: "right" }]} onChange={(v) => u("headlineAlign", v as StudioConfig["headlineAlign"])} /><Range label="Tamanho" value={c.headlineSize} min={16} max={64} suffix="px" onChange={(v) => u("headlineSize", v)} /><Color label="Cor do texto" value={c.headlineColor} onChange={(v) => u("headlineColor", v)} /><Color label="Cor de fundo" value={c.headlineBackground} onChange={(v) => u("headlineBackground", v)} /></>;
  if (module === "hooks") return <><TextArea label="Texto do Mini-Ganho / Widget" value={c.miniHookText} onChange={(v) => u("miniHookText", v)} /><TimeRange label="Aparecer em" value={c.miniHookStart} max={Math.max(1, Math.floor(c.videoDuration || 1))} onChange={(v) => u("miniHookStart", v)} /><Range label="Duração" value={c.miniHookDuration} min={2} max={60} suffix="s" onChange={(v) => u("miniHookDuration", v)} /><Color label="Cor do texto" value={c.miniHookTextColor} onChange={(v) => u("miniHookTextColor", v)} /><Color label="Cor do fundo" value={c.miniHookBackground} onChange={(v) => u("miniHookBackground", v)} /></>;
  if (module === "traffic") return <><p className="panel-help">As regras são avaliadas no backend.</p><Select label="Idioma do navegador" value={c.browserLanguage} options={["Todos", "Português", "Inglês", "Espanhol"]} onChange={(v) => u("browserLanguage", v)} /><TextInput label="Países permitidos" value={c.allowedCountries} placeholder="Todos ou BR, PT, US" onChange={(v) => u("allowedCountries", v)} /><CheckRow label="Bloquear Proxy / VPN" checked={c.blockVpn} onChange={(v) => u("blockVpn", v)} /></>;
  if (module === "actions") return <><TextInput label="Texto do Botão" value={c.ctaText} onChange={(v) => u("ctaText", v)} /><TextInput label="Subtítulo / Garantia abaixo do Botão" value={c.ctaSubtitle} placeholder="Ex: 🔒 Compra 100% Segura • Entrega Imediata" onChange={(v) => u("ctaSubtitle", v)} /><TextInput label="Selo de Segurança / Badges" value={c.ctaBadges} placeholder="Ex: 7 Dias de Garantia • Pix em 12x" onChange={(v) => u("ctaBadges", v)} /><TextInput label="Link de Destino" value={c.ctaUrl} onChange={(v) => u("ctaUrl", v)} /><CheckRow label="Fazer o botão pulsar" checked={c.ctaPulse} onChange={(v) => u("ctaPulse", v)} /><Color label="Cor do texto" value={c.ctaTextColor} onChange={(v) => u("ctaTextColor", v)} /><Color label="Cor do botão" value={c.ctaBackground} onChange={(v) => u("ctaBackground", v)} /></>;
  if (module === "thumbnail") return <><p className="panel-help">Use capas diferentes para aumentar o clique inicial e recuperar pausas ou finais.</p><UploadBox label="Thumbnail inicial" selectedName={c.thumbnailStartName || (c.assets.thumbnailStart ? "Thumbnail salva" : "")} accept="image/*" onFile={(file) => { onPoster(file, "start"); u("thumbnailStartName", file.name); u("thumbnailEnabled", true); }} /></>;
  if (module === "resume") return <TextArea label="Mensagem" value={c.resumeMessage} onChange={(v) => u("resumeMessage", v)} />;
  if (module === "pixels") return <PixelTrackingPanel config={c} update={u} playerId={playerId} videoId={videoId} />;
  if (module === "protection") return <CheckRow label="Ativar barreiras anti-download" checked={c.antiDownload} onChange={(v) => u("antiDownload", v)} />;
  if (module === "captions") return <UploadBox label={c.captionName || "Upload de legenda WebVTT"} accept=".vtt,text/vtt" onFile={(file) => { onCaption(file); u("captionName", file.name); u("captionsEnabled", true); }} />;
  return <><CheckRow label="Começar sem som" checked={c.muted} onChange={(v) => u("muted", v)} /><CheckRow label="Recomeçar após o fim" checked={c.loop} onChange={(v) => u("loop", v)} /></>;
}

function PanelTitle({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-black/10 dark:border-white/10 pt-5 text-[15px] font-semibold">{children}</h3>; }

function HeadlinePreview({ config, desktopUrl, mobileUrl }: { config: StudioConfig; desktopUrl?: string; mobileUrl?: string }) {
  if (config.headlineFormat === "image" && (desktopUrl || mobileUrl)) {
    return <picture className="mx-auto mb-3 block max-h-[112px] max-w-2xl shrink-0 overflow-hidden"><source media="(max-width: 767px)" srcSet={mobileUrl || desktopUrl} /><img src={desktopUrl || mobileUrl} alt="Prévia da headline" className="block h-full max-h-[112px] w-full object-contain" /></picture>;
  }
  return (
    <div className="mb-4 flex flex-col items-center justify-center text-center space-y-1">
      {config.headlineTagBadge && (
        <span className="rounded-full bg-[#191A23] px-3 py-0.5 text-[10px] font-extrabold text-[#B9FF66] border border-[#B9FF66]">
          {config.headlineTagBadge}
        </span>
      )}
      <h2 className="mx-auto w-fit max-w-2xl px-4 py-2 font-extrabold leading-tight tracking-tight" style={{ color: config.headlineColor, backgroundColor: config.headlineBackground, fontSize: `${Math.min(config.headlineSize, 32)}px`, textAlign: config.headlineAlign, borderRadius: `${Math.min(config.radius, 16)}px` }}>
        {config.headline || "Digite sua headline"}
      </h2>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`ml-auto h-6 w-11 rounded-full p-1 cursor-pointer ${checked ? "bg-[#B9FF66]" : "bg-slate-300 dark:bg-zinc-700"}`}><span className={`block h-4 w-4 rounded-full bg-[#191A23] transition-transform ${checked ? "translate-x-5" : ""}`} /></button>; }
function ControlIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const Icon = normalized.includes("paus") ? PauseCircle : normalized.includes("progres") ? Gauge : normalized.includes("tempo") ? Clock3 : normalized.includes("voltar") ? Rewind : normalized.includes("avanç") ? FastForward : normalized.includes("volume") || normalized.includes("som") ? Volume2 : normalized.includes("fullscreen") ? Maximize : normalized.includes("picture") ? PictureInPicture2 : normalized.includes("veloc") ? Gauge : normalized.includes("desktop") ? MonitorPlay : normalized.includes("prote") || normalized.includes("token") || normalized.includes("vpn") || normalized.includes("chave") ? LockKeyhole : Play;
  return <Icon size={17} strokeWidth={1.8} className="shrink-0 text-[#191A23] dark:text-[#B9FF66]" aria-hidden="true" />;
}
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 items-center gap-3 rounded-[11px] bg-slate-100 dark:bg-zinc-900 px-3 text-[14px] cursor-pointer"><ControlIcon label={label} /><span className="flex-1 font-medium">{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#B9FF66]" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<div className="mt-2 flex gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 rounded-lg cursor-pointer border border-slate-200 dark:border-zinc-800" /><input value={value} onChange={(e) => onChange(e.target.value)} className="studio-input h-10 rounded-xl border border-slate-200 dark:border-zinc-800 px-3 text-xs font-medium" /></div></label>; }
function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<{ label: string; value: string }>; onChange: (value: string) => void }) { return <fieldset><legend className="mb-2 text-[14px] font-semibold">{label}</legend><div className="grid grid-cols-2 gap-1 rounded-[11px] bg-slate-100 p-1 dark:bg-zinc-900">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`min-h-9 rounded-[8px] px-2 text-[12px] font-semibold transition cursor-pointer ${value === option.value ? "bg-[#B9FF66] text-[#191A23] font-bold shadow-xs" : "text-slate-600 dark:text-zinc-400"}`}>{option.label}</button>)}</div></fieldset>; }
function Range({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) { return <label className="block text-[14px] font-semibold">{label}<span className="float-right text-[12px] font-bold text-[#191A23] dark:text-[#B9FF66]">{value}{suffix}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[#B9FF66]" /></label>; }
function formatPlayerTime(value: number) { const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function TimeRange({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) { const safeValue = Math.min(Math.max(0, value), max); return <label className="block text-[14px] font-semibold">{label}<span className="float-right rounded-full bg-[#B9FF66] px-2.5 py-0.5 text-[11px] font-bold text-[#191A23]">{formatPlayerTime(safeValue)} / {formatPlayerTime(max)}</span><input type="range" min={0} max={max} step={1} value={safeValue} onChange={(e) => onChange(Number(e.target.value))} className="mt-4 w-full accent-[#B9FF66]" /></label>; }
function TextInput({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder?: string; onChange?: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<input value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)} className="studio-input mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 text-xs font-medium text-[#191A23] dark:text-white outline-none focus:border-[#B9FF66]" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="studio-input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs font-medium text-[#191A23] dark:text-white outline-none focus:border-[#B9FF66]" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="studio-input mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-[#191A23] dark:text-white outline-none">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function UploadBox({ label, selectedName, accept, onFile }: { label: string; selectedName?: string; accept: string; onFile: (file: File) => void }) { return <label className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition-colors ${selectedName ? "border-[#B9FF66] bg-[#B9FF66]/10" : "border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50"}`}><Subtitles size={24} className={`mb-2 ${selectedName ? "text-[#191A23] dark:text-[#B9FF66]" : "text-slate-400"}`} /><span className="text-[13px] font-bold">{label}</span>{selectedName ? <span className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ {selectedName}</span> : <span className="mt-1 text-[11px] text-slate-400">Clique para selecionar</span>}<input type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>; }
