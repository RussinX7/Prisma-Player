import { Target } from "lucide-react";
import FeaturePlaceholder from "@/components/dashboard/FeaturePlaceholder";

export default function ConversionsPage() {
  return (
    <FeaturePlaceholder
      icon={Target}
      title="Conversões"
      description="Acompanhe ações geradas pelos seus vídeos"
      emptyTitle="Nenhuma conversão registrada"
      emptyDescription="Eventos de CTA, formulários e vendas aparecerão aqui depois que seus players começarem a receber tráfego."
    />
  );
}
