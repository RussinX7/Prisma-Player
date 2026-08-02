import { BarChart3, MousePointerClick, ShoppingBag, Target } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
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

  return (
    <main className="dashboard-content space-y-6">
      <PageHeader
        icon={<ShoppingBag size={20} />}
        title="Conversões & Jornada"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Plays únicos", value: totals.plays, icon: BarChart3 },
          { label: "Cliques na CTA", value: totals.clicks, icon: MousePointerClick },
          { label: "Compras atribuídas", value: totals.conversions, icon: ShoppingBag },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-[25px] border-2 border-[#191A23] bg-white p-5 shadow-[3px_3px_0px_#191A23]">
              <span className="flex items-center gap-2 text-xs font-bold uppercase text-[#191A23]/70">
                <Icon size={16} className="text-[#191A23]" />
                {metric.label}
              </span>
              <strong className="mt-3 block text-3xl font-black tracking-tight text-[#191A23]">
                {metric.value.toLocaleString("pt-BR")}
              </strong>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[30px] border-2 border-[#191A23] bg-white p-2 shadow-[4px_4px_0px_#191A23]">
        <div className="border-b-2 border-[#191A23]/10 px-6 py-4">
          <h2 className="text-lg font-black text-[#191A23]">Desempenho por VSL</h2>
          <p className="mt-0.5 text-xs font-medium text-[#191A23]/70">
            A conversão aparece somente quando uma integração de compra envia o evento confirmado.
          </p>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm text-[#191A23]">
              <thead className="bg-[#F3F3F3] text-xs font-black uppercase text-[#191A23] border-b-2 border-[#191A23]">
                <tr>
                  <th className="px-6 py-4 font-black">VSL</th>
                  <th className="px-4 py-4 font-black">Plays</th>
                  <th className="px-4 py-4 font-black">Cliques</th>
                  <th className="px-4 py-4 font-black">Compras</th>
                  <th className="px-6 py-4 text-right font-black">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y border-[#191A23]/20 font-medium">
                {rows.map((row) => (
                  <tr key={row.videoId} className="hover:bg-[#F3F3F3]/50">
                    <td className="max-w-[360px] truncate px-6 py-4 font-bold text-[#191A23]">{row.title}</td>
                    <td className="px-4 py-4 font-semibold text-[#191A23]">{row.plays}</td>
                    <td className="px-4 py-4 font-semibold text-[#191A23]">{row.clicks}</td>
                    <td className="px-4 py-4 font-semibold text-[#191A23]">{row.conversions}</td>
                    <td className="px-6 py-4 text-right font-black text-[#191A23] font-mono">
                      <span className="inline-flex rounded-full border border-[#191A23] bg-[#B9FF66] px-3 py-1 text-xs font-black shadow-[1px_1px_0px_#191A23]">
                        {row.rate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[3px_3px_0px_#191A23]">
                <Target size={26} />
              </div>
              <h3 className="mt-4 text-xl font-black text-[#191A23]">Aguardando os primeiros eventos</h3>
              <p className="mx-auto mt-2 max-w-md text-xs font-medium text-[#191A23]/70 leading-relaxed">
                Publique uma VSL e conecte o evento de compra para enxergar o caminho completo entre play, CTA e venda.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
