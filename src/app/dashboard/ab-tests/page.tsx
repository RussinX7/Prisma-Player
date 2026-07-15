import { FlaskConical } from "lucide-react";
import FeaturePlaceholder from "@/components/dashboard/FeaturePlaceholder";

export default function AbTestsPage() {
  return (
    <FeaturePlaceholder
      icon={FlaskConical}
      title="Testes A/B"
      description="Compare versões e descubra o que converte melhor"
      emptyTitle="Nenhum teste em execução"
      emptyDescription="Quando você criar variações de vídeo, thumbnail ou player, os experimentos aparecerão aqui."
    />
  );
}
