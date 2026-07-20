import type { ReactNode } from "react";
import { 
  Video, 
  FlaskConical, 
  Shield, 
  Target, 
  BrainCircuit, 
  Settings, 
  CreditCard, 
  LifeBuoy 
} from "lucide-react";

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  isActive?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    items: [
      {
        title: "Meus vídeos",
        path: "/dashboard/videos",
        icon: <Video className="size-4" />,
      },
      {
        title: "Testes A/B",
        path: "/dashboard/ab-tests",
        icon: <FlaskConical className="size-4" />,
      },
      {
        title: "Segurança",
        path: "/dashboard/security",
        icon: <Shield className="size-4" />,
      },
      {
        title: "Conversões",
        path: "/dashboard/conversions",
        icon: <Target className="size-4" />,
      },
      {
        title: "Inteligência",
        path: "/dashboard/intelligence",
        icon: <BrainCircuit className="size-4" />,
      },
      {
        title: "Configurações",
        path: "/dashboard/settings",
        icon: <Settings className="size-4" />,
      },
      {
        title: "Plano",
        path: "/dashboard/billing",
        icon: <CreditCard className="size-4" />,
      },
    ],
  }
];

export const footerNavLinks: SidebarNavItem[] = [
  {
    title: "Ajuda",
    path: "#",
    icon: <LifeBuoy className="size-4" />,
  },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) =>
      item.subItems?.length ? [item, ...item.subItems] : [item]
    )
  ),
  ...footerNavLinks,
];
