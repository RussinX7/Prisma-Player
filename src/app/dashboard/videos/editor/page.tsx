"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Code2, Eye, LayoutPanelLeft, MousePointerClick, Palette, Play, Save, Settings2, ShieldCheck, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { VideoPlayer } from "@/components/player";
import Dialog from "@/components/ui/Dialog";

type EditorTab = "appearance" | "behavior" | "features";
interface StoredVideo { name: string; src: string; type: string }

const featureOptions = [
  { id: "smartProgress", label: "Progresso inteligente", description: "Ajusta a percepção de duração da VSL." },
  { id: "resume", label: "Continuar assistindo", description: "Retoma do ponto salvo no navegador." },
  { id: "cta", label: "Botão de ação", description: "Mostra uma oferta no momento escolhido." },
  { id: "domain", label: "Proteção de domínio", description: "Restringe o embed aos sites permitidos." },
];

export default function VideoEditorPage() {
  const [video] = useState<StoredVideo | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem("prisma-mvp-video") ?? "null") as StoredVideo | null; } catch { return null; }
  });
  const [tab, setTab] = useState<EditorTab>("appearance");
  const [accent, setAccent] = useState("#0066cc");
  const [radius, setRadius] = useState(18);
  const [headline, setHeadline] = useState("Descubra a maneira mais simples de transformar atenção em vendas");
  const [autoplay, setAutoplay] = useState(false);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [ctaText, setCtaText] = useState("Quero aproveitar agora");
  const [ctaTime, setCtaTime] = useState(60);
  const [features, setFeatures] = useState<Record<string, boolean>>({ smartProgress: true, resume: true, cta: false, domain: false });
  const [saved, setSaved] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sources = useMemo(() => video ? [{ src: video.src, type: video.type }] : [], [video]);
  const style = { "--player-accent": accent, borderRadius: `${radius}px` } as CSSProperties;

  function saveDraft() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  const embedCode = '<script src="https://player.prismaplayer.com/embed.js" data-player="demo-vsl"></script>';

  async function copyEmbed() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <Header title="Editor de VSL" description="Personalize a experiência sem alterar o arquivo original" />
      <section className="dashboard-content">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/dashboard/videos" className="inline-flex min-h-11 items-center gap-2 text-[14px] text-prisma-blue"><ArrowLeft size={16} />Voltar aos vídeos</Link>
            <h2 className="truncate text-[22px] font-semibold themeable-text-ink">{video?.name ?? "Nova experiência de vídeo"}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEmbedOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] themeable-border-hairline themeable-text-ink"><Code2 size={16} />Embed</button>
            <button type="button" onClick={saveDraft} className="flex min-h-11 items-center gap-2 rounded-full bg-prisma-blue px-5 text-[14px] text-white">{saved ? <Check size={16} /> : <Save size={16} />}{saved ? "Salvo" : "Salvar"}</button>
          </div>
        </div>

        <div className="grid min-h-[680px] overflow-hidden rounded-[18px] border themeable-bg-canvas themeable-border-hairline xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b themeable-border-hairline xl:border-b-0 xl:border-r">
            <div className="grid grid-cols-3 border-b themeable-border-hairline">
              {([{ id: "appearance", label: "Aparência", icon: Palette }, { id: "behavior", label: "Comportamento", icon: Settings2 }, { id: "features", label: "Recursos", icon: Sparkles }] as const).map((item) => (
                <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-2 text-[12px] ${tab === item.id ? "border-prisma-blue text-prisma-blue" : "border-transparent themeable-text-ink-muted-48"}`}><item.icon size={16} />{item.label}</button>
              ))}
            </div>
            <div className="max-h-[620px] space-y-7 overflow-y-auto p-5 sm:p-6">
              {tab === "appearance" && <>
                <EditorSection title="Identidade do player" icon={Palette}>
                  <label className="editor-label">Cor principal<div className="mt-2 flex items-center gap-3"><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="h-11 w-14 rounded-lg border-0 bg-transparent" /><input value={accent} onChange={(event) => setAccent(event.target.value)} className="editor-input flex-1" /></div></label>
                  <label className="editor-label">Cantos arredondados <span>{radius}px</span><input type="range" min="0" max="28" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-3 w-full accent-prisma-blue" /></label>
                </EditorSection>
                <EditorSection title="Headline" icon={LayoutPanelLeft}><textarea value={headline} onChange={(event) => setHeadline(event.target.value)} rows={4} className="editor-textarea" /></EditorSection>
              </>}
              {tab === "behavior" && <>
                <EditorSection title="Reprodução" icon={Play}><Toggle label="Autoplay" description="Inicia sem interação quando permitido." checked={autoplay} onChange={setAutoplay} /><Toggle label="Começar sem som" description="Recomendado quando autoplay estiver ativo." checked={muted} onChange={setMuted} /><Toggle label="Mostrar controles" description="Exibe play, volume, tempo e tela cheia." checked={controls} onChange={setControls} /></EditorSection>
                <EditorSection title="Oferta sincronizada" icon={MousePointerClick}><label className="editor-label">Texto do botão<input value={ctaText} onChange={(event) => setCtaText(event.target.value)} className="editor-input mt-2" /></label><label className="editor-label">Aparecer em {Math.floor(ctaTime / 60)}:{String(ctaTime % 60).padStart(2, "0")}<input type="range" min="0" max="600" value={ctaTime} onChange={(event) => setCtaTime(Number(event.target.value))} className="mt-3 w-full accent-prisma-blue" /></label></EditorSection>
              </>}
              {tab === "features" && <EditorSection title="Funcionalidades" icon={Sparkles}>{featureOptions.map((item) => <Toggle key={item.id} label={item.label} description={item.description} checked={Boolean(features[item.id])} onChange={(checked) => setFeatures((current) => ({ ...current, [item.id]: checked }))} />)}</EditorSection>}
            </div>
          </aside>

          <main className="flex min-w-0 flex-col bg-black p-4 sm:p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between gap-3 text-white"><div className="flex items-center gap-2"><Eye size={17} /><span className="text-[14px]">Prévia ao vivo</span></div><div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[12px]"><Smartphone size={14} />Responsiva</div></div>
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-4xl">
                <div className="mb-4 text-center text-white"><p className="text-[clamp(20px,3vw,34px)] font-semibold leading-tight tracking-[-0.02em]">{headline}</p></div>
                {video ? <div style={style} className="overflow-hidden"><VideoPlayer sources={sources} autoplay={autoplay} muted={muted} controls={controls} /></div> : <div style={style} className="flex aspect-video items-center justify-center border border-white/10 bg-[#252527] text-center text-white/60"><div><Play size={38} className="mx-auto mb-3" /><p>Importe um vídeo para visualizar a VSL</p></div></div>}
                {features.cta && <button type="button" style={{ backgroundColor: accent }} className="mx-auto mt-5 flex min-h-12 items-center justify-center rounded-full px-7 text-[16px] text-white">{ctaText}</button>}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-[12px] text-white/50"><ShieldCheck size={15} /><span>Prévia local. Nenhuma configuração sensível é enviada pelo editor.</span></div>
          </main>
        </div>
      </section>
      <Dialog open={embedOpen} onClose={() => setEmbedOpen(false)} title="Código de incorporação" description="Exemplo visual do contrato futuro. O player público será criado no backend." size="md" footer={<button type="button" onClick={copyEmbed} className="min-h-11 rounded-full bg-prisma-blue px-5 text-white">{copied ? "Código copiado" : "Copiar código"}</button>}>
        <pre className="overflow-x-auto rounded-[11px] bg-black p-4 text-[13px] leading-relaxed text-white"><code>{embedCode}</code></pre>
        <p className="mt-4 text-[13px] leading-relaxed themeable-text-ink-muted-48">Nenhuma chave secreta faz parte do embed. O identificador público aponta para uma configuração sanitizada e autorizada pelo servidor.</p>
      </Dialog>
    </>
  );
}

function EditorSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <section className="space-y-5"><h3 className="flex items-center gap-2 text-[17px] font-semibold themeable-text-ink"><Icon size={18} className="text-prisma-blue" />{title}</h3>{children}</section>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-[11px] themeable-bg-surface-pearl p-4"><span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold themeable-text-ink">{label}</span><span className="mt-1 block text-[12px] leading-relaxed themeable-text-ink-muted-48">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className="relative mt-0.5 h-6 w-11 rounded-full bg-black/20 transition-colors peer-checked:bg-prisma-blue after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" /></label>;
}
