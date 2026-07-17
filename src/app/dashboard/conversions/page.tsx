import { BarChart3, MousePointerClick, ShoppingBag, Target } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { requireUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ConversionsPage() {
  const userId = await requireUser("/dashboard/conversions");
  const admin = createAdminClient();
  const [{ data: events }, { data: videos }] = await Promise.all([
    admin.from("video_events").select("video_id,session_id,event_type,created_at").eq("user_id", userId).in("event_type", ["play", "cta_click", "conversion"]).order("created_at", { ascending: false }).limit(10000),
    admin.from("videos").select("id,title").eq("user_id", userId),
  ]);
  const titles = new Map((videos ?? []).map((video) => [video.id, video.title]));
  const rows = [...new Set((events ?? []).map((event) => event.video_id))].map((videoId) => {
    const videoEvents = (events ?? []).filter((event) => event.video_id === videoId);
    const plays = new Set(videoEvents.filter((event) => event.event_type === "play").map((event) => event.session_id)).size;
    const clicks = new Set(videoEvents.filter((event) => event.event_type === "cta_click").map((event) => event.session_id)).size;
    const conversions = new Set(videoEvents.filter((event) => event.event_type === "conversion").map((event) => event.session_id)).size;
    return { videoId, title: titles.get(videoId) ?? "VSL removida", plays, clicks, conversions, rate: plays ? conversions / plays * 100 : 0 };
  }).sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks);
  const totals = rows.reduce((current, row) => ({ plays: current.plays + row.plays, clicks: current.clicks + row.clicks, conversions: current.conversions + row.conversions }), { plays: 0, clicks: 0, conversions: 0 });

  return <><Header /><main className="dashboard-content"><div><p className="text-[12px] font-semibold uppercase tracking-[.14em] text-prisma-blue">Jornada de compra</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-.7px] themeable-text-ink">Conversões</h1><p className="mt-1 text-[14px] themeable-text-ink-muted-48">Eventos reais mais recentes recebidos pelas embeds.</p></div>
    <section className="mt-6 grid gap-3 sm:grid-cols-3">{[
      { label: "Plays únicos", value: totals.plays, icon: BarChart3 },
      { label: "Cliques na CTA", value: totals.clicks, icon: MousePointerClick },
      { label: "Compras atribuídas", value: totals.conversions, icon: ShoppingBag },
    ].map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-[18px] border p-5 themeable-bg-canvas themeable-border-hairline"><span className="flex items-center gap-2 text-[12px] themeable-text-ink-muted-48"><Icon size={16} className="text-prisma-blue" />{metric.label}</span><strong className="mt-3 block text-[30px] tracking-[-.8px] themeable-text-ink">{metric.value.toLocaleString("pt-BR")}</strong></article>; })}</section>
    <section className="mt-5 overflow-hidden rounded-[20px] border themeable-bg-canvas themeable-border-hairline"><div className="border-b px-5 py-4 themeable-border-hairline"><h2 className="text-[16px] font-semibold themeable-text-ink">Desempenho por VSL</h2><p className="mt-1 text-[12px] themeable-text-ink-muted-48">A conversão aparece somente quando uma integração de compra envia o evento confirmado.</p></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-[13px]"><thead className="themeable-bg-surface-pearl themeable-text-ink-muted-48"><tr><th className="px-5 py-3 font-medium">VSL</th><th className="px-4 py-3 font-medium">Plays</th><th className="px-4 py-3 font-medium">Cliques</th><th className="px-4 py-3 font-medium">Compras</th><th className="px-5 py-3 text-right font-medium">Conversão</th></tr></thead><tbody>{rows.map((row) => <tr key={row.videoId} className="border-t themeable-border-hairline"><td className="max-w-[360px] truncate px-5 py-4 font-medium themeable-text-ink">{row.title}</td><td className="px-4 py-4 themeable-text-ink">{row.plays}</td><td className="px-4 py-4 themeable-text-ink">{row.clicks}</td><td className="px-4 py-4 themeable-text-ink">{row.conversions}</td><td className="px-5 py-4 text-right font-semibold text-prisma-blue">{row.rate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</td></tr>)}</tbody></table></div> : <div className="grid min-h-72 place-items-center px-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-prisma-blue/10 text-prisma-blue"><Target size={24} /></span><h3 className="mt-4 text-[18px] font-semibold themeable-text-ink">Aguardando os primeiros eventos</h3><p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed themeable-text-ink-muted-48">Publique uma VSL e conecte o evento de compra para enxergar o caminho completo entre play, CTA e venda.</p></div></div>}</section>
  </main></>;
}
