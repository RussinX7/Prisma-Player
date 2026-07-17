export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amount_cents: number;
  currency: "BRL";
  included_plays: number;
  storage_gb: number;
  prisma_ai_analyses: number;
  team_seats: number;
  play_overage_millicents: number;
  provider_pix_product_id: string | null;
  provider_card_product_id: string | null;
  is_featured: boolean;
};

export const sharedFeatures = [
  "Todas as funcionalidades de personalização e conversão",
  "Analytics completo, retenção e funil da VSL",
  "Testes A/B de vídeos e proteção por domínio",
  "Pixels e integrações de conversão",
];

export function getPlanBenefits(plan: BillingPlan) {
  return [
    ...sharedFeatures,
    `${plan.included_plays.toLocaleString("pt-BR")} plays incluídos por mês`,
    `${plan.storage_gb.toLocaleString("pt-BR")} GB na biblioteca`,
    `${plan.prisma_ai_analyses.toLocaleString("pt-BR")} análises da Prisma IA por mês`,
    plan.team_seats === 1 ? "1 acesso à conta" : `${plan.team_seats} acessos para a equipe`,
    `${formatPlayOverage(plan.play_overage_millicents)} por play excedente`,
  ];
}

export function formatPlayOverage(millicents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millicents / 100_000);
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
}
