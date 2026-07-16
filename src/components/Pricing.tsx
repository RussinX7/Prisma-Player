import Link from "next/link";

const features = [
  "Vídeos e plays sem limite artificial", "Player totalmente personalizado", "Smart Autoplay e Progresso Inteligente",
  "CTA, Headlines e thumbnails", "Teste A/B e Analytics avançado", "Proteção por domínio", "Todas as funcionalidades atuais e futuras",
];

export default function Pricing() {
  return <section id="pricing" className="bg-surface-black py-section"><div className="container-section mx-auto max-w-[760px] px-6 text-center">
    <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-prisma-blue">Um plano. Tudo incluído.</span>
    <h2 className="mt-3 text-display-lg text-on-dark">Prisma Completo</h2>
    <p className="mx-auto mb-10 mt-3 max-w-[600px] text-lead themeable-text-body-muted">Sem cobrar por play, quantidade de vídeos ou funcionalidade. Você escolhe o melhor player para sua operação.</p>
    <div className="mx-auto max-w-[560px] rounded-[28px] border border-white/10 bg-surface-tile-1 p-7 text-left text-on-dark shadow-2xl sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><h3 className="text-[22px] font-semibold">Plano Completo</h3><p className="mt-1 text-[14px] text-white/60">Cobrança mensal via PIX pela SyncPay</p></div><div><strong className="text-[48px] font-semibold tracking-[-2px]">R$ 97</strong><span className="text-white/55">/mês</span></div></div>
      <div className="my-7 h-px bg-white/10" />
      <ul className="grid gap-3 sm:grid-cols-2">{features.map((feature) => <li key={feature} className="flex gap-2 text-[14px] text-white/85"><span className="text-prisma-blue">✓</span>{feature}</li>)}</ul>
      <Link href="/checkout" className="mt-8 block min-h-12 rounded-full bg-prisma-blue px-6 py-3 text-center text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[.99]">Assinar Prisma Completo</Link>
    </div>
    <p className="mt-6 text-[12px] text-white/45">Cancele quando quiser. O acesso é liberado somente após a confirmação segura do pagamento.</p>
  </div></section>;
}
