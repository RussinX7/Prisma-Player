"use client";

import type { ReactNode } from "react";

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

export default function PageHeader({
  icon,
  title,
  actions = [],
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] shadow-[2px_2px_0px_#191A23] flex items-center justify-center">
            {icon}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#191A23]">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`
                flex min-h-10 items-center justify-center gap-2 rounded-full text-xs transition-all active:scale-95 cursor-pointer
                ${
                  action.primary
                    ? "bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] font-black shadow-[3px_3px_0px_#191A23] px-4 py-2 hover:bg-[#B9FF66]/90"
                    : "bg-white text-[#191A23] border-2 border-[#191A23] font-bold shadow-[2px_2px_0px_#191A23] px-3.5 py-2 hover:bg-[#B9FF66]/20"
                }
              `}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
