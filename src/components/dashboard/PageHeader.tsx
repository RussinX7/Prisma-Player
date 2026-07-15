"use client";

import type { ReactNode } from "react";
import { Plus, Upload, FolderPlus, Download } from "lucide-react";

interface Action {
  label: string;
  icon?: ReactNode;
  primary?: boolean;
  onClick: () => void;
}

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  actions?: Action[];
  children?: ReactNode;
}

const defaultActions = [
  {
    label: "Upload",
    icon: <Upload size={16} />,
    primary: false,
    onClick: () => {},
  },
  {
    label: "Criar",
    icon: <Plus size={16} />,
    primary: true,
    onClick: () => {},
  },
  {
    label: "Nova Pasta",
    icon: <FolderPlus size={16} />,
    primary: false,
    onClick: () => {},
  },
  {
    label: "Exportar",
    icon: <Download size={16} />,
    primary: false,
    onClick: () => {},
  },
];

export default function PageHeader({
  icon,
  title,
  actions = defaultActions,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-prisma-blue/10 flex items-center justify-center">
            <div className="text-prisma-blue">{icon}</div>
          </div>
          <h2 className="text-[22px] font-semibold tracking-[-0.35px] themeable-text-ink">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`
                flex items-center gap-1.5 rounded-full transition-all active:scale-[0.97] text-[13px] font-medium tracking-[-0.2px]
                ${
                  action.primary
                    ? "bg-prisma-blue text-white px-4 py-2 hover:opacity-90"
                    : "px-3.5 py-2 themeable-bg-surface-pearl themeable-text-ink-muted-80 hover:themeable-text-ink border themeable-border-hairline"
                }
              `}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
