"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Captions, Check, ChevronRight, Code2, Gauge, Globe2, Heading, ImageIcon, MousePointerClick, Palette, Play, Radio, RotateCcw, Save, Shield, Subtitles, TimerReset, Zap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Dialog from "@/components/ui/Dialog";
import { VideoPlayer } from "@/components/player";

interface StoredVideo { id?: string; name: string; src: string; type: string }
type ModuleId = "style" | "progress" | "autoplay" | "turbo" | "headlines" | "traffic" | "actions" | "thumbnail" | "resume" | "pixels" | "captions" | "playback";

interface StudioConfig {
  accent: string; background: string; radius: number; bigPlay: boolean; progressBar: boolean; time: boolean; volume: boolean; fullscreen: boolean; pictureInPicture: boolean; speedControl: boolean;
  smartProgress: boolean; progressColor: string; progressHeight: number; smartAutoplay: boolean; autoplayMessage: string; playbackRate: number;
  headlineEnabled: boolean; headline: string; trafficEnabled: boolean; domains: string[]; blockVpn: boolean; accessToken: boolean;
  ctaEnabled: boolean; ctaText: string; ctaUrl: string; ctaStart: number; thumbnailEnabled: boolean; resumeEnabled: boolean; resumeMessage: string;
  pixelsEnabled: boolean; pixelProvider: string; pixelName: string; pixelId: string; captionsEnabled: boolean; captionName: string;
  loop: boolean; muted: boolean; smartPause: boolean; fullscreenDesktop: boolean; fullscreenMobile: boolean;
}

const rates = [0.75, 1, 1.25, 1.5, 2];
const modules: Array<{ id: ModuleId; label: string; icon: typeof Palette; status?: keyof StudioConfig; badge?: string }> = [
  { id: "style", label: "Estilo", icon: Palette },
  { id: "progress", label: "Progresso inteligente", icon: Gauge, status: "smartProgress" },
  { id: "autoplay", label: "Smart Autoplay", icon: Play, status: "smartAutoplay" },
  { id: "turbo", label: "Turbo", icon: Zap, badge: "Teste" },
  { id: "headlines", label: "Headlines", icon: Heading, status: "headlineEnabled" },
  { id: "traffic", label: "Filtro de tráfego", icon: Shield, status: "trafficEnabled", badge: "Novo" },
  { id: "actions", label: "Botões de ação", icon: MousePointerClick, status: "ctaEnabled" },
  { id: "thumbnail", label: "ThumbSniper", icon: ImageIcon, status: "thumbnailEnabled" },
  { id: "resume", label: "Continuar assistindo", icon: RotateCcw, status: "resumeEnabled" },
  { id: "pixels", label: "Pixels", icon: Radio, status: "pixelsEnabled" },
  { id: "captions", label: "Legendas", icon: Captions, status: "captionsEnabled" },
  { id: "playback", label: "Opções de reprodução", icon: TimerReset },
];

const initialConfig: StudioConfig = {
  accent: "#0066cc", background: "#000000", radius: 12, bigPlay: true, progressBar: true, time: true, volume: true, fullscreen: true, pictureInPicture: true, speedControl: true,
  smartProgress: true, progressColor: "#0066cc", progressHeight: 6, smartAutoplay: true, autoplayMessage: "Seu vídeo já começou. Clique para ouvir.", playbackRate: 1,
  headlineEnabled: true, headline: "Descubra a maneira mais simples de transformar atenção em vendas", trafficEnabled: false, domains: [], blockVpn: true, accessToken: false,
  ctaEnabled: false, ctaText: "Quero aproveitar agora", ctaUrl: "https://", ctaStart: 60, thumbnailEnabled: false, resumeEnabled: true, resumeMessage: "Você já começou a assistir este vídeo",
  pixelsEnabled: false, pixelProvider: "Meta", pixelName: "", pixelId: "", captionsEnabled: false, captionName: "",
  loop: false, muted: false, smartPause: true, fullscreenDesktop: true, fullscreenMobile: true,
};

export default function VslStudio() {
  const [video] = useState<StoredVideo | null>(() => { if (typeof window === "undefined") return null; try { return JSON.parse(sessionStorage.getItem("prisma-mvp-video") ?? "null") as StoredVideo | null; } catch { return null; } });
  const [active, setActive] = useState<ModuleId | null>(null);
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
  const [saved, setSaved] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>();
  const [captionTrack, setCaptionTrack] = useState<{ src: string; kind: "subtitles"; label: string; srclang: string; default: boolean }>();
  const sources = useMemo(() => video ? [{ src: video.src, type: video.type }] : [], [video]);
  const controlVisibility = useMemo(() => ({ progressControl: config.progressBar, currentTimeDisplay: config.time, durationDisplay: config.time, volumePanel: config.volume, fullscreenToggle: config.fullscreen, pictureInPictureToggle: config.pictureInPicture, playbackRateMenuButton: config.speedControl }), [config.progressBar, config.time, config.volume, config.fullscreen, config.pictureInPicture, config.speedControl]);
  const playerStyle = { "--player-accent": config.smartProgress ? config.progressColor : config.accent, "--player-progress-height": `${config.progressHeight}px`, borderRadius: `${config.radius}px`, backgroundColor: config.background } as CSSProperties;
  const resumeStorageKey = `prisma-resume:${video?.id ?? video?.name ?? "preview"}`;
  const lastPersistedSecond = useRef(-1);
  const previewRatio = videoSize.width > 0 && videoSize.height > 0 ? videoSize.width / videoSize.height : 16 / 9;
  const previewStyle = { ...playerStyle, aspectRatio: `${videoSize.width} / ${videoSize.height}`, width: `min(100%, calc(62dvh * ${previewRatio}))`, maxWidth: "680px" } as CSSProperties;
  const update = <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));

  async function save() {
    localStorage.setItem("prisma-studio-config", JSON.stringify(config));
    if (video?.id) {
      const response = await fetch("/api/player-configs", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId: video.id, config, domains: config.domains }) });
      if (!response.ok) return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  function handleMetadata(metadata: { duration: number; width: number; height: number }) {
    setDuration(metadata.duration);
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

  return <div className="min-h-dvh bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#1d1d1f] dark:text-white">
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-black/10 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/85 sm:px-6">
      <div className="flex min-w-0 items-center gap-4"><BrandLogo className="hidden h-8 w-[154px] sm:inline-block" /><div className="hidden h-7 w-px bg-black/10 dark:bg-white/10 sm:block" /><div className="min-w-0"><p className="text-[12px] text-[#7a7a7a]">Studio Prisma</p><h1 className="truncate text-[15px] font-semibold">{video?.name ?? "Personalizador de VSL"}</h1></div></div>
      <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setEmbedOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-4 text-[14px] dark:border-white/15"><Code2 size={16} /><span className="hidden sm:inline">Embed</span></button><button type="button" onClick={save} className="flex min-h-11 items-center gap-2 rounded-full bg-[#0066cc] px-5 text-[14px] text-white">{saved ? <Check size={16} /> : <Save size={16} />}{saved ? "Salvo" : "Salvar"}</button></div>
    </header>

    <div className="grid min-h-[calc(100dvh-64px)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-[#272729] lg:border-b-0 lg:border-r">
        <div className="sticky top-16 max-h-[calc(100dvh-64px)] overflow-y-auto p-3 sm:p-4">
          {active ? <ModulePanel module={active} config={config} update={update} onBack={() => setActive(null)} onPoster={(file) => { if (posterUrl) URL.revokeObjectURL(posterUrl); setPosterUrl(URL.createObjectURL(file)); }} onCaption={(file) => { if (captionTrack) URL.revokeObjectURL(captionTrack.src); setCaptionTrack({ src: URL.createObjectURL(file), kind: "subtitles", label: file.name, srclang: "pt-BR", default: true }); }} /> : <>
            <Link href="/dashboard/videos" className="mb-3 flex min-h-11 items-center gap-2 px-3 text-[14px] text-[#0066cc]"><ArrowLeft size={16} />Voltar aos vídeos</Link>
            <div className="mb-4 px-3"><h2 className="text-[20px] font-semibold">Personalização</h2><p className="mt-1 text-[13px] text-[#7a7a7a] dark:text-[#a1a1a6]">Escolha um módulo para configurar.</p></div>
            <nav className="space-y-1">{modules.map((item) => { const enabled = item.status ? Boolean(config[item.status]) : undefined; return <button key={item.id} type="button" onClick={() => setActive(item.id)} className="flex min-h-12 w-full items-center gap-3 rounded-[11px] px-3 text-left transition-colors hover:bg-[#f5f5f7] dark:hover:bg-[#2a2a2c]"><item.icon size={18} className="text-[#0066cc] dark:text-[#2997ff]" /><span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{item.label}</span>{item.badge && <span className="rounded bg-[#0066cc] px-1.5 py-0.5 text-[9px] text-white">{item.badge}</span>}{enabled !== undefined && <span className={`text-[11px] font-semibold ${enabled ? "text-green-500" : "text-red-500"}`}>{enabled ? "On" : "Off"}</span>}<ChevronRight size={15} className="text-[#7a7a7a]" /></button>; })}</nav>
          </>}
        </div>
      </aside>

      <main className="flex min-w-0 flex-col bg-[#000] p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex items-center justify-between text-white"><div><p className="text-[12px] text-white/50">Prévia ao vivo</p><p className="text-[14px] font-semibold">{active ? modules.find((item) => item.id === active)?.label : "Visão geral"}</p></div><span className="rounded-full bg-white/10 px-3 py-2 text-[12px]">{config.playbackRate.toFixed(2)}x</span></div>
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[#252527] p-4 sm:p-8">
          <div className="w-full">
            {config.headlineEnabled && <h2 className="mx-auto mb-4 max-w-2xl text-center text-[clamp(18px,2.6vw,30px)] font-semibold leading-tight text-white">{config.headline}</h2>}
            {video ? <div style={previewStyle} className="relative mx-auto max-h-[62dvh] overflow-hidden"><VideoPlayer className={`${config.fullscreenDesktop ? "" : "prisma-player--fullscreen-desktop-hidden"} ${config.fullscreenMobile ? "" : "prisma-player--fullscreen-mobile-hidden"}`} sources={sources} poster={config.thumbnailEnabled ? posterUrl : undefined} textTracks={config.captionsEnabled && captionTrack ? [captionTrack] : []} autoplay={config.smartAutoplay && resumePoint === null} muted={config.muted || (config.smartAutoplay && !autoplayActivated)} controls playbackRate={config.playbackRate} playbackRates={rates} loop={config.loop} bigPlayButton={config.bigPlay} pauseWhenHidden={config.smartPause} startTime={startTime} controlVisibility={controlVisibility} onLoadedMetadata={handleMetadata} onTimeUpdate={handleTimeUpdate} onEnded={() => { if (!config.loop) localStorage.removeItem(resumeStorageKey); }} />
              {resumePoint !== null && <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-5 text-center text-white backdrop-blur-sm"><div><p className="mb-4 text-[16px] font-semibold">{config.resumeMessage}</p><div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => { setStartTime(resumePoint); setResumePoint(null); setAutoplayActivated(true); }} className="min-h-11 rounded-full bg-white px-5 text-[13px] font-semibold text-black">Continuar em {Math.floor(resumePoint / 60)}:{String(Math.floor(resumePoint % 60)).padStart(2, "0")}</button><button type="button" onClick={() => { localStorage.removeItem(resumeStorageKey); setStartTime(0); setResumePoint(null); }} className="min-h-11 rounded-full border border-white/30 px-5 text-[13px] font-semibold">Assistir do início</button></div></div></div>}
              {config.smartAutoplay && !autoplayActivated && resumePoint === null && <button type="button" onClick={() => setAutoplayActivated(true)} className="absolute left-1/2 top-1/2 z-10 w-[min(240px,80%)] -translate-x-1/2 -translate-y-1/2 rounded-[11px] border border-white/40 px-5 py-3 text-center text-[13px] font-semibold text-white backdrop-blur-md" style={{ backgroundColor: `${config.accent}dd` }}>{config.autoplayMessage}</button>}
            </div> : <div style={playerStyle} className="mx-auto flex aspect-video max-w-[680px] items-center justify-center text-center text-white/50"><div><Play size={36} className="mx-auto mb-3" /><p>Importe um vídeo para testar o Studio</p></div></div>}
            {config.ctaEnabled && currentTime >= config.ctaStart && <a href={config.ctaUrl} target="_blank" rel="noreferrer" className="mx-auto mt-5 flex min-h-12 w-fit items-center rounded-full px-7 text-[16px] text-white" style={{ backgroundColor: config.accent }}>{config.ctaText}</a>}
            {video && <p className="mt-3 text-center text-[11px] text-white/40">{videoSize.width}×{videoSize.height} · {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "Lendo metadados"}</p>}
          </div>
        </div>
      </main>
    </div>
    <Dialog open={embedOpen} onClose={() => setEmbedOpen(false)} title="Código de incorporação" description="O identificador é público; segredos permanecem no servidor." footer={<button type="button" onClick={() => navigator.clipboard.writeText('<script src="https://player.prismaplayer.com/embed.js" data-player="demo"></script>')} className="min-h-11 rounded-full bg-[#0066cc] px-5 text-white">Copiar código</button>}><pre className="overflow-x-auto rounded-[11px] bg-black p-4 text-[12px] text-white">{'<script src="https://player.prismaplayer.com/embed.js" data-player="demo"></script>'}</pre></Dialog>
  </div>;
}

function ModulePanel({ module, config, update, onBack, onPoster, onCaption }: { module: ModuleId; config: StudioConfig; update: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void; onBack: () => void; onPoster: (file: File) => void; onCaption: (file: File) => void }) {
  const definition = modules.find((item) => item.id === module)!;
  const Icon = definition.icon;
  const toggleStatus = (value: boolean) => {
    if (definition.status) update(definition.status, value as StudioConfig[typeof definition.status]);
  };
  return <div><button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-[13px] text-[#0066cc] dark:text-[#2997ff]"><ArrowLeft size={15} />Voltar à personalização</button><div className="mb-5 flex items-center gap-3 border-b border-black/10 pb-5 dark:border-white/10"><Icon size={21} className="text-[#0066cc] dark:text-[#2997ff]" /><h2 className="text-[18px] font-semibold">{definition.label}</h2>{definition.status && <Switch checked={Boolean(config[definition.status])} onChange={toggleStatus} />}</div><div className="space-y-6">{renderPanel(module, config, update, onPoster, onCaption)}</div></div>;
}

function renderPanel(module: ModuleId, c: StudioConfig, u: <K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) => void, onPoster: (file: File) => void, onCaption: (file: File) => void) {
  if (module === "style") return <><Color label="Cor principal" value={c.accent} onChange={(v) => u("accent", v)} /><Color label="Fundo" value={c.background} onChange={(v) => u("background", v)} /><Range label="Cantos arredondados" value={c.radius} min={0} max={28} suffix="px" onChange={(v) => u("radius", v)} /><PanelTitle>Controles do player</PanelTitle><CheckRow label="Feedback central de play" checked={c.bigPlay} onChange={(v) => u("bigPlay", v)} /><CheckRow label="Barra de progresso" checked={c.progressBar} onChange={(v) => u("progressBar", v)} /><CheckRow label="Tempo do vídeo" checked={c.time} onChange={(v) => u("time", v)} /><CheckRow label="Volume" checked={c.volume} onChange={(v) => u("volume", v)} /><CheckRow label="Fullscreen" checked={c.fullscreen} onChange={(v) => u("fullscreen", v)} /><CheckRow label="Picture-in-Picture" checked={c.pictureInPicture} onChange={(v) => u("pictureInPicture", v)} /><CheckRow label="Velocidades" checked={c.speedControl} onChange={(v) => u("speedControl", v)} /></>;
  if (module === "progress") return <><p className="panel-help">Uma camada visual do Prisma sobre o ProgressControl do Video.js.</p><Color label="Cor da barra" value={c.progressColor} onChange={(v) => u("progressColor", v)} /><Range label="Altura" value={c.progressHeight} min={3} max={12} suffix="px" onChange={(v) => u("progressHeight", v)} /></>;
  if (module === "autoplay") return <><p className="panel-help">Autoplay segue as políticas do navegador e começa mudo quando necessário.</p><TextArea label="Mensagem de ativação" value={c.autoplayMessage} onChange={(v) => u("autoplayMessage", v)} /></>;
  if (module === "turbo") return <><p className="panel-help">Teste manual de playbackRate usando a API nativa do Video.js.</p><Range label="Velocidade" value={c.playbackRate} min={0.75} max={2} step={0.25} suffix="x" onChange={(v) => u("playbackRate", v)} /></>;
  if (module === "headlines") return <TextArea label="Texto da headline" value={c.headline} onChange={(v) => u("headline", v)} />;
  if (module === "traffic") return <><TextInput label="Adicionar domínio" placeholder="checkout.exemplo.com" onEnter={(value) => { const clean = value.replace(/^https?:\/\//, "").replace(/\/.*$/, ""); if (clean && !c.domains.includes(clean)) u("domains", [...c.domains, clean]); }} />{c.domains.map((domain) => <div key={domain} className="flex min-h-11 items-center gap-2 rounded-[11px] bg-black/5 px-3 text-[13px] dark:bg-white/5"><Globe2 size={15} /><span className="flex-1 truncate">{domain}</span><button onClick={() => u("domains", c.domains.filter((item) => item !== domain))}>×</button></div>)}<CheckRow label="Bloquear Proxy / VPN" checked={c.blockVpn} onChange={(v) => u("blockVpn", v)} /><CheckRow label="Exigir token de acesso" checked={c.accessToken} onChange={(v) => u("accessToken", v)} /></>;
  if (module === "actions") return <><TextInput label="Texto do botão" value={c.ctaText} onChange={(v) => u("ctaText", v)} /><TextInput label="Link" value={c.ctaUrl} onChange={(v) => u("ctaUrl", v)} /><Range label="Aparecer em" value={c.ctaStart} min={0} max={600} suffix="s" onChange={(v) => u("ctaStart", v)} /></>;
  if (module === "thumbnail") return <UploadBox label="Imagem de recuperação" accept="image/*" onFile={(file) => { onPoster(file); u("thumbnailEnabled", true); }} />;
  if (module === "resume") return <TextArea label="Mensagem" value={c.resumeMessage} onChange={(v) => u("resumeMessage", v)} />;
  if (module === "pixels") return <><Select label="Provedor" value={c.pixelProvider} options={["Meta", "Google", "Personalizado"]} onChange={(v) => u("pixelProvider", v)} /><TextInput label="Nome" value={c.pixelName} onChange={(v) => u("pixelName", v)} /><TextInput label="ID público do pixel" value={c.pixelId} onChange={(v) => u("pixelId", v)} /><p className="panel-help">Tokens e segredos de conversão não entram no navegador.</p></>;
  if (module === "captions") return <UploadBox label={c.captionName || "Upload de legenda WebVTT"} accept=".vtt,text/vtt" onFile={(file) => { onCaption(file); u("captionName", file.name); u("captionsEnabled", true); }} />;
  return <><CheckRow label="Começar sem som" checked={c.muted} onChange={(v) => u("muted", v)} /><CheckRow label="Recomeçar após o fim" checked={c.loop} onChange={(v) => u("loop", v)} /><CheckRow label="Smart Pause ao trocar de aba" checked={c.smartPause} onChange={(v) => u("smartPause", v)} /><CheckRow label="Fullscreen no desktop" checked={c.fullscreenDesktop} onChange={(v) => u("fullscreenDesktop", v)} /><CheckRow label="Fullscreen no mobile" checked={c.fullscreenMobile} onChange={(v) => u("fullscreenMobile", v)} /></>;
}

function PanelTitle({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-black/10 pt-5 text-[15px] font-semibold dark:border-white/10">{children}</h3>; }
function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button type="button" onClick={() => onChange(!checked)} className={`ml-auto h-6 w-11 rounded-full p-1 ${checked ? "bg-green-500" : "bg-black/20 dark:bg-white/20"}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} /></button>; }
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 items-center gap-3 rounded-[11px] bg-black/[0.035] px-3 text-[14px] dark:bg-white/5"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0066cc]" /><span>{label}</span></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<div className="mt-2 flex gap-2"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-14" /><input value={value} onChange={(e) => onChange(e.target.value)} className="studio-input" /></div></label>; }
function Range({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) { return <label className="block text-[14px] font-semibold">{label}<span className="float-right text-[12px] font-normal text-[#7a7a7a]">{value}{suffix}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[#0066cc]" /></label>; }
function TextInput({ label, value, placeholder, onChange, onEnter }: { label: string; value?: string; placeholder?: string; onChange?: (value: string) => void; onEnter?: (value: string) => void }) { const [local, setLocal] = useState(value ?? ""); return <label className="block text-[14px] font-semibold">{label}<input value={onChange ? value : local} placeholder={placeholder} onChange={(e) => { setLocal(e.target.value); onChange?.(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter" && onEnter) { onEnter(local); setLocal(""); } }} className="studio-input mt-2" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className="studio-input mt-2 resize-y" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block text-[14px] font-semibold">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="studio-input mt-2">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function UploadBox({ label, accept, onFile }: { label: string; accept: string; onFile: (file: File) => void }) { return <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed border-[#0066cc] px-4 text-center"><Subtitles size={26} className="mb-3 text-[#0066cc]" /><span className="text-[14px] font-semibold">{label}</span><span className="mt-1 text-[12px] text-[#7a7a7a]">Clique para selecionar</span><input type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>; }
