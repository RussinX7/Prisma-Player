const plans = [
  {
    name: "Essential",
    price: "R$ 49",
    period: "/mês",
    description: "Perfeito para quem está começando a vender com vídeo.",
    features: [
      "1 player de vídeo",
      "Teste A/B",
      "Analytics básico",
      "Botões de Ação",
      "Suporte por e-mail",
    ],
    cta: "Começar teste grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 99",
    period: "/mês",
    description: "Para profissionais que levam a sério a conversão.",
    features: [
      "Players ilimitados",
      "Headlines AI",
      "Smart Autoplay",
      "Turbo Playback",
      "Thumbnail de Recuperação",
      "Mini-Gancho",
      "Analytics avançado",
      "Pixel & Remarketing",
      "Suporte prioritário",
    ],
    cta: "Começar teste grátis",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes operações que exigem o melhor.",
    features: [
      "Players ilimitados",
      "Todas as funcionalidades Pro",
      "Progresso Inteligente",
      "Continuar Assistindo",
      "Personalização total de estilo",
      "Gerente de conta dedicado",
      "SLA garantido",
      "Onboarding personalizado",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-section bg-surface-black">
      <div className="container-section max-w-[980px] mx-auto px-6 text-center">
        <h2 className="text-display-lg text-on-dark mb-3">
          Planos & Preços
        </h2>
        <p className="text-lead themeable-text-body-muted mb-16 max-w-[650px] mx-auto">
          Aumente sua conversão sem limites. Nenhum plano tem restrição de players.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-[980px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
  className={`rounded-lg p-8 text-left flex flex-col ${
    plan.highlighted
      ? "themeable-bg-canvas dark:bg-surface-tile-2 themeable-text-ink dark:text-on-dark ring-2 ring-prisma-blue scale-105 md:scale-105"
      : "bg-surface-tile-1 text-on-dark"
  }`}
            >
              <h3
                className={`text-tagline mb-1 ${
                  plan.highlighted ? "themeable-text-ink" : "text-on-dark"
                }`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-hero text-inherit">
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    className={`text-caption ${
                      plan.highlighted ? "themeable-text-ink-muted-48" : "themeable-text-body-muted"
                    }`}
                  >
                    {plan.period}
                  </span>
                )}
              </div>
              <p
                className={`text-sm mb-8 ${
                  plan.highlighted ? "themeable-text-ink-muted-80" : "themeable-text-body-muted"
                }`}
              >
                {plan.description}
              </p>

              <ul className="space-y-3 mb-10 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      className="mt-0.5 shrink-0"
                    >
                      <path
                        d="M15 5L7.1 13L3 9"
                        stroke={plan.highlighted ? "#0066cc" : "#2997ff"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm">{feat}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`block w-full text-center py-3 px-6 rounded-pill text-sm font-normal transition-all active:scale-95 ${
                  plan.highlighted
                    ? "bg-prisma-blue text-white hover:opacity-90"
                    : "bg-white/10 text-on-dark hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-fine themeable-text-body-muted mt-8">
          Todos os planos incluem 14 dias de teste grátis. Sem compromisso.
          Sem limite de players no Pro e Enterprise.
        </p>
      </div>
    </section>
  );
}
