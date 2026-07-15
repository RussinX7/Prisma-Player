import { Shield } from "lucide-react";
import FeaturePlaceholder from "@/components/dashboard/FeaturePlaceholder";

export default function SecurityPage() {
  return (
    <FeaturePlaceholder
      icon={Shield}
      title="Segurança"
      description="Controle onde e como seus vídeos são exibidos"
      emptyTitle="Proteções prontas para configurar"
      emptyDescription="Domínios permitidos, links assinados e regras de acesso serão configurados aqui quando o backend for conectado."
    />
  );
}
