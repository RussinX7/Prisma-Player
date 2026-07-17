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
  provider_pix_product_id: string | null;
  provider_card_product_id: string | null;
  is_featured: boolean;
};

export const sharedFeatures = [
  "Todas as funcionalidades de personalizacao e conversao",
  "Analytics completo, retencao e funil da VSL",
  "Testes A/B e protecao por dominio",
  "Pixels e integracoes de conversao",
];

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
}
